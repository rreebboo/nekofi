import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useAccountStore } from '@/stores/accountStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { brickService } from '@/services/brickService';
import { CreateAccountDto } from '@/types/account';

type ConnectState = 'loading' | 'webview' | 'linking' | 'success' | 'error';

export default function ConnectAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const { addAccount } = useAccountStore();
  const webViewRef = useRef<WebView>(null);

  // Params passed from add.tsx
  const publicToken = params.publicToken as string;
  const redirectUrl = params.redirectUrl as string;
  const name = params.name as string;
  const type = params.type as string;
  const brandIcon = params.brandIcon as string;
  const color = params.color as string;
  const textColor = params.textColor as string;

  const [state, setState] = useState<ConnectState>(publicToken ? 'webview' : 'error');
  const [errorMessage, setErrorMessage] = useState('');

  // Build the Brick Link widget URL with the public token
  const widgetUrl = redirectUrl
    ? `${redirectUrl}?accessToken=${publicToken}`
    : `https://sandbox.onebrick.io/v2/widget?accessToken=${publicToken}`;

  /**
   * Handle messages from the Brick WebView.
   * Brick posts a message when the user completes or cancels the flow.
   */
  const handleWebViewMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.status === 'success' && data.accessToken) {
        setState('linking');

        // Step 1: Create the account locally first (optimistic)
        const accountDto: CreateAccountDto = {
          name,
          type: type as any,
          brandIcon: brandIcon as any,
          color,
          gradientEnd: '#0F1115',
          textColor: textColor || '#FFFFFF',
        };

        await addAccount(accountDto);

        // Get the account ID from the store (it was just added)
        const accounts = useAccountStore.getState().accounts;
        const newAccount = accounts.find(a => a.name === name);

        if (!newAccount) {
          throw new Error('Account was not created successfully');
        }

        // Step 2: Link the account via the backend
        const linkResult = await brickService.linkAccount(
          data.accessToken,
          newAccount.id,
          name,
        );

        // Step 3: Update the account with linked status and balance
        useAccountStore.setState((s) => ({
          accounts: s.accounts.map(a =>
            a.id === newAccount.id
              ? {
                  ...a,
                  balance: linkResult.balance,
                  isLinked: true,
                  linkedAccountId: linkResult.linkedAccountId,
                  syncStatus: 'synced',
                }
              : a
          ),
        }));

        setState('success');

        // Navigate back after a brief success animation
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1500);
      } else if (data.status === 'error') {
        setErrorMessage(data.message || 'Connection failed. Please try again.');
        setState('error');
      } else if (data.status === 'closed' || data.status === 'cancelled') {
        router.back();
      }
    } catch (err: any) {
      console.error('Error processing Brick response:', err);
      setErrorMessage(err.message || 'Something went wrong while linking your account.');
      setState('error');
    }
  }, [name, type, brandIcon, color, textColor, addAccount, router]);

  /**
   * JavaScript injected into the WebView to capture Brick's postMessage events
   * and forward them to React Native.
   */
  const injectedJS = `
    (function() {
      // Listen for Brick's completion message
      window.addEventListener('message', function(event) {
        if (event.data && typeof event.data === 'string') {
          window.ReactNativeWebView.postMessage(event.data);
        } else if (event.data && typeof event.data === 'object') {
          window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
        }
      });

      // Also intercept if Brick uses a custom callback
      if (window.onBrickSuccess) {
        var originalSuccess = window.onBrickSuccess;
        window.onBrickSuccess = function(data) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: 'success',
            accessToken: data.accessToken || data.access_token,
          }));
          if (originalSuccess) originalSuccess(data);
        };
      }
      true;
    })();
  `;

  const handleRetry = () => {
    if (publicToken) {
      setState('webview');
      setErrorMessage('');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Connect {name}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* WebView State */}
      {state === 'webview' && (
        <WebView
          ref={webViewRef}
          source={{ uri: widgetUrl }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
          injectedJavaScript={injectedJS}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={color || colors.primary} />
              <Text style={[styles.statusText, { color: colors.textMuted }]}>
                Loading secure connection...
              </Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setErrorMessage('Failed to load the connection page. Please check your internet connection.');
            setState('error');
          }}
        />
      )}

      {/* Linking State */}
      {state === 'linking' && (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.statusIcon, { backgroundColor: (color || colors.primary) + '20' }]}>
            <ActivityIndicator size="large" color={color || colors.primary} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>Linking {name}...</Text>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Fetching your balance and recent transactions.
          </Text>
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

            <Pressable style={styles.cancelLink} onPress={() => router.back()}>
              <Text style={[styles.cancelLinkText, { color: colors.textMuted }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Loading State (initial) */}
      {state === 'loading' && (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={color || colors.primary} />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Preparing secure connection...
          </Text>
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
  webview: { flex: 1 },
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
  cancelLink: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
});
