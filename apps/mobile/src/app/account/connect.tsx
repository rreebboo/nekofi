import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAccountStore } from '@/stores/accountStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { bankService } from '@/services/bankService';
import { supabase } from '@/services/supabase/client';
import type { CreateAccountDto } from '@/types/account';

type ConnectState = 'launching' | 'waiting' | 'syncing' | 'success' | 'error';

/** Polling interval for checking statement status (ms) */
const SYNC_POLL_INTERVAL = 3000;
/** Maximum number of poll attempts before timing out */
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes

export default function ConnectAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const { addAccount } = useAccountStore();

  // Params passed from add.tsx
  const redirectUrl = params.redirectUrl as string;
  const statementId = params.statementId as string;
  const name = params.name as string;
  const type = params.type as string;
  const brandIcon = params.brandIcon as string;
  const color = params.color as string;
  const textColor = params.textColor as string;

  const [state, setState] = useState<ConnectState>(redirectUrl ? 'launching' : 'error');
  const [errorMessage, setErrorMessage] = useState(
    redirectUrl ? '' : 'No connection URL received. Please go back and try again.',
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  /**
   * Clean up the polling interval.
   */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  /**
   * Poll the brankas-sync function to check if the statement is ready,
   * then sync transactions into the database.
   */
  const pollForSync = useCallback(async (stmtId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
      setErrorMessage('You must be signed in to sync your account.');
      setState('error');
      stopPolling();
      return;
    }

    setState('syncing');

    pollRef.current = setInterval(async () => {
      pollCountRef.current++;

      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        // Don't error — the sync will still happen via webhook if configured
        // Just let the user know it's taking longer
        setState('success');
        setTimeout(() => router.replace('/(tabs)'), 1500);
        return;
      }

      try {
        const result = await bankService.syncStatement(stmtId, userId);

        if (result.status === 'synced') {
          stopPolling();

          // Update the account in the store with balance
          const accounts = useAccountStore.getState().accounts;
          const targetAccount = accounts.find(a => a.name === name);

          if (targetAccount && result.balance !== undefined) {
            useAccountStore.setState((s) => ({
              accounts: s.accounts.map(a =>
                a.id === targetAccount.id
                  ? {
                      ...a,
                      balance: result.balance ?? a.balance,
                      isLinked: true,
                      linkedAccountId: stmtId,
                      syncStatus: 'synced',
                    }
                  : a
              ),
            }));
          }

          setState('success');
          setTimeout(() => router.replace('/(tabs)'), 1500);
        }
        // If status is 'pending' or similar, keep polling
      } catch (err: any) {
        console.error('[ConnectAccount] Sync poll error:', err);
        // Don't stop polling on transient errors
      }
    }, SYNC_POLL_INTERVAL);
  }, [name, router, stopPolling]);

  /**
   * Open the Brankas Tap URL in the system browser.
   * When the user finishes, they're redirected back to the app via deep link.
   */
  const openBrankasTap = useCallback(async () => {
    if (!redirectUrl) return;

    setState('launching');

    try {
      const result = await WebBrowser.openAuthSessionAsync(
        redirectUrl,
        'nekofi://bank-connect',
      );

      // If openAuthSessionAsync resolves (browser closed), start polling.
      // This may not fire if Expo Router intercepts the deep link first,
      // in which case the AppState fallback below handles it.
      if (result.type === 'success' || result.type === 'dismiss') {
        if (!pollRef.current) {
          await pollForSync(statementId);
        }
      } else if (result.type === 'cancel') {
        router.back();
      }
    } catch (err: any) {
      console.error('[ConnectAccount] WebBrowser error:', err);
      setErrorMessage('Failed to open the secure connection page.');
      setState('error');
    }
  }, [redirectUrl, statementId, pollForSync, router]);

  /**
   * Fallback: When the app comes back to foreground after the browser,
   * start polling if we haven't already. This handles the case where
   * Expo Router intercepts the deep link before openAuthSessionAsync resolves.
   */
  useEffect(() => {
    const handleAppState = (nextState: string) => {
      if (nextState === 'active' && state === 'launching' && !pollRef.current) {
        pollForSync(statementId);
      }
    };

    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [state, statementId, pollForSync]);

  /**
   * Handle deep link callbacks from Brankas.
   * The Tap UI redirects to nekofi://bank-connect/success or /error.
   * These are also handled by route files in app/bank-connect/,
   * which call router.back() to return here.
   */
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('bank-connect/error')) {
        stopPolling();
        setErrorMessage('Bank connection was unsuccessful. Please try again.');
        setState('error');
      } else if (url.includes('bank-connect/success')) {
        // Start sync if not already polling
        if (!pollRef.current) {
          pollForSync(statementId);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
      stopPolling();
    };
  }, [statementId, pollForSync, stopPolling]);

  /**
   * Launch the browser on mount.
   */
  useEffect(() => {
    if (redirectUrl && state === 'launching') {
      // Create the account optimistically before launching
      const createAndLaunch = async () => {
        try {
          const accountDto: CreateAccountDto = {
            name,
            type: type as any,
            brandIcon: brandIcon as any,
            color,
            gradientEnd: '#0F1115',
            textColor: textColor || '#FFFFFF',
          };
          await addAccount(accountDto);
          await openBrankasTap();
        } catch (err: any) {
          console.error('[ConnectAccount] Error:', err);
          setErrorMessage(err.message || 'Something went wrong.');
          setState('error');
        }
      };
      createAndLaunch();
    }
  }, []); // Run once on mount

  const handleRetry = () => {
    if (redirectUrl) {
      openBrankasTap();
    } else {
      router.back();
    }
  };

  /** Navigate to the manual setup screen as a fallback. */
  const handleManualFallback = () => {
    router.replace({
      pathname: '/account/setup',
      params: {
        name,
        type,
        brandIcon,
        color,
        textColor,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <Pressable onPress={() => { stopPolling(); router.back(); }} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Connect {name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Launching / Waiting State */}
      {(state === 'launching' || state === 'waiting') && (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.statusIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
            <ActivityIndicator size="large" color={color || colors.primary} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {state === 'launching' ? 'Opening secure connection...' : 'Waiting for bank login...'}
          </Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Complete the login in the browser window that just opened. You'll be redirected back here when done.
          </Text>
        </View>
      )}

      {/* Syncing State */}
      {state === 'syncing' && (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.statusIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
            <ActivityIndicator size="large" color={color || colors.primary} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>Syncing {name}...</Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Securely fetching your balance and recent transactions. This usually takes 15–30 seconds.
          </Text>
          <Text style={[styles.statusHint, { color: colors.textMuted }]}>
            {pollCountRef.current > 3
              ? 'Almost there — processing your data...'
              : 'Connecting to your bank...'}
          </Text>

          {/* Let user continue using the app while sync runs in background */}
          <Pressable
            style={[styles.backgroundButton, { borderColor: colors.borderAlt }]}
            onPress={() => {
              // Don't stop polling — it continues in background
              // and updates the store when complete
              router.replace('/(tabs)');
            }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.backgroundButtonText, { color: colors.textMuted }]}>
              Continue in background
            </Text>
          </Pressable>
        </View>
      )}

      {/* Success State */}
      {state === 'success' && (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.statusIcon, { backgroundColor: '#20A17520' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#20A175" />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>{name} Connected!</Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Your account has been linked successfully. Transactions will sync automatically.
          </Text>
        </View>
      )}

      {/* Error State */}
      {state === 'error' && (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.statusIcon, { backgroundColor: '#FF4D4D20' }]}>
            <Ionicons name="alert-circle" size={64} color="#FF4D4D" />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>Connection Failed</Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            {errorMessage || 'Something went wrong. Please try again.'}
          </Text>

          <View style={styles.errorActions}>
            <Pressable
              style={[styles.retryButton, { backgroundColor: color || colors.primary }]}
              onPress={handleRetry}
            >
              <Text style={[styles.retryButtonText, { color: textColor || '#FFF' }]}>
                Try Again
              </Text>
            </Pressable>

            {/* Manual fallback — always visible on error */}
            <Pressable style={styles.manualFallbackButton} onPress={handleManualFallback}>
              <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.manualFallbackText, { color: colors.text }]}>
                Add manually instead
              </Text>
            </Pressable>

            <Pressable style={styles.cancelLink} onPress={() => router.back()}>
              <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginLeft: -4 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 18 },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statusIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
  statusHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  backgroundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  backgroundButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  errorActions: {
    marginTop: 32,
    width: '100%',
  },
  retryButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  retryButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  manualFallbackButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  manualFallbackText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
  cancelLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
});
