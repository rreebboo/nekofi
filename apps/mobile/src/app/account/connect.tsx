import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
} from 'react-native-reanimated';

import { useAccountStore } from '@/stores/accountStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MockAuthService } from '@/services/mockAuthService';
import { getProviderConfig, validatePhoneNumber } from '@/constants/providerConfig';

// Reusable auth widgets
import { PhoneNumberInput } from '@/components/auth/PhoneNumberInput';
import { OTPInput } from '@/components/auth/OTPInput';
import { CountdownTimer } from '@/components/auth/CountdownTimer';
import { ProviderHeader } from '@/components/auth/ProviderHeader';
import { StepIndicator } from '@/components/auth/StepIndicator';
import { VerificationSuccess } from '@/components/auth/VerificationSuccess';
import { MockLoadingCard } from '@/components/auth/MockLoadingCard';
import type { AuthStep } from '@/components/auth/StepIndicator';

// ─── State Machine ────────────────────────────────────────────────────────────

type ConnectState =
  | 'permission'   // Step 0 — existing screen (unchanged)
  | 'identifier'   // Step 1 — phone number or username
  | 'otp'          // Step 2 — 6-digit OTP
  | 'verified'     // Step 3 — success animation (brief)
  | 'syncing'      // Step 4 — mock account loading card
  | 'success';     // Step 5 — connected, redirect

type SyncStep = 'connecting' | 'fetching' | 'importing';

// Map connect states to StepIndicator steps
function toIndicatorStep(state: ConnectState): AuthStep {
  if (state === 'otp') return 'otp';
  if (state === 'verified' || state === 'syncing' || state === 'success') return 'connected';
  return 'identifier';
}

// ─── Disclaimer Banner ────────────────────────────────────────────────────────

function DisclaimerBanner({ color, colors }: { color: string; colors: any }) {
  return (
    <View style={[styles.disclaimer, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
      <View style={[styles.disclaimerIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name="flask-outline" size={14} color={color} />
      </View>
      <View style={styles.disclaimerBody}>
        <Text style={[styles.disclaimerTitle, { color: colors.text }]}>Demo Mode</Text>
        <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
          Simulated for academic purposes only. No real accounts are accessed.
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConnectAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams();


  // Params from add.tsx
  const name = params.name as string;
  const type = params.type as string;
  const brandIcon = params.brandIcon as string;
  const providerColor = (params.color as string) || colors.primary;
  const textColor = (params.textColor as string) || '#FFFFFF';

  // Resolve provider config
  const config = getProviderConfig(name, providerColor);
  const primaryColor = config.primaryColor || providerColor;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [connectState, setConnectState] = useState<ConnectState>('permission');
  const [identifier, setIdentifier] = useState('');
  const [identifierValid, setIdentifierValid] = useState(false);
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [otpResetKey, setOtpResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStep, setSyncStep] = useState<SyncStep>('connecting');
  const [mockBalance, setMockBalance] = useState<string | undefined>(undefined);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  /** Step 0 → 1: user tapped "Allow Connection" */
  const handleAllowPermission = () => {
    setConnectState('identifier');
  };

  /** Step 1 → 2: submit identifier and trigger mock OTP send */
  const handleSubmitIdentifier = async () => {
    if (!isIdentifierValid()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await MockAuthService.sendOTP(name, identifier);
      setMaskedIdentifier(result.maskedIdentifier);
      setConnectState('otp');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** Resend OTP — restarts timer only, no real call needed */
  const handleResendOtp = useCallback(() => {
    setOtpResetKey((k) => k + 1);
    setOtp('');
    MockAuthService.sendOTP(name, identifier); // fire-and-forget
  }, [name, identifier]);

  /** Step 2 → 3: verify OTP */
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const result = await MockAuthService.verifyOTP(name, otp);
      if (!result.success) {
        setError(result.error ?? 'Invalid OTP. Please try again.');
        setLoading(false);
        return;
      }

      // Generate mock token (not stored, just for realism)
      MockAuthService.generateMockToken(name);

      setLoading(false);
      setConnectState('verified');

      // After brief verified animation → go to syncing
      setTimeout(() => {
        setConnectState('syncing');
        runMockSync();
      }, 1200);
    } catch {
      setError('Verification failed. Please try again.');
      setLoading(false);
    }
  };

  /** Run the mock sync sequence and then update the account store */
  const runMockSync = async () => {
    setSyncStep('connecting');
    await sleep(800);
    setSyncStep('fetching');

    // Fetch mock balance in parallel with transactions
    const [balance] = await Promise.all([
      MockAuthService.fetchMockBalance(name),
      MockAuthService.fetchMockTransactions(name),
    ]);

    setMockBalance(balance.formattedAmount);
    await sleep(600);
    setSyncStep('importing');
    await sleep(700);

    // ─── Inject directly as 'synced' — bypass the sync queue ───────────────
    //
    // We do NOT call addAccount() here because that marks the account as
    // 'pending_insert', which causes the sync engine to immediately upsert it
    // to Supabase with balance=0. Then fetchAccounts() overwrites our local
    // enriched data with the Supabase version, making the account appear to
    // vanish. Mock-connected accounts are local-only, so we inject them
    // directly into the store as 'synced' to skip the queue entirely.
    const { v4: uuidv4 } = require('uuid');
    const mockAccount = {
      id: uuidv4(),
      name,
      type: type as any,
      brandIcon: brandIcon as any,
      balance: balance.amount,
      currency: 'PHP',
      color: providerColor,
      gradientEnd: '#0F1115',
      textColor,
      numberMasked: Math.floor(1000 + Math.random() * 9000).toString(),
      isLinked: true,
      isLocal: true,            // ← tells fetchAccounts to never overwrite this
      linkedAccountId: `mock-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'synced' as const,
    };

    useAccountStore.setState((s) => ({
      accounts: [...s.accounts, mockAccount],
    }));

    setConnectState('success');
    setTimeout(() => router.replace('/(tabs)'), 2000);
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const isIdentifierValid = (): boolean => {
    const trimmed = identifier.trim();
    if (!trimmed) return false;
    if (config.identifierType === 'phone') {
      return validatePhoneNumber(trimmed);
    }
    if (config.identifierType === 'phone_or_username') {
      // Accept any non-empty value; phone validation fires visually only if looks like a phone
      return trimmed.length >= 3;
    }
    return trimmed.length >= 3;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const headerTitle =
    connectState === 'permission'
      ? 'Secure Connection'
      : connectState === 'identifier'
      ? `Connect ${name}`
      : connectState === 'otp'
      ? 'Verification'
      : connectState === 'verified' || connectState === 'syncing'
      ? 'Syncing...'
      : 'Connected!';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <Pressable
          onPress={() => (connectState === 'permission' ? router.back() : undefined)}
          style={styles.backButton}
          disabled={connectState !== 'permission'}
        >
          {connectState === 'permission' && (
            <Ionicons name="close" size={24} color={colors.text} />
          )}
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ── Step Indicator (shown after permission) ── */}
      {(connectState === 'identifier' || connectState === 'otp') && (
        <StepIndicator currentStep={toIndicatorStep(connectState)} accentColor={primaryColor} />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ═══════════════════════════════════════════
              STEP 0 — Permission Request (unchanged)
          ═══════════════════════════════════════════ */}
          {connectState === 'permission' && (
            <Animated.View entering={FadeIn} exiting={SlideOutLeft} style={styles.stepContainer}>
              <View style={styles.connectionGraphic}>
                <View style={[styles.appIconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="wallet" size={32} color={colors.primary} />
                </View>
                <View style={styles.connectionLine}>
                  <View style={[styles.animatedDot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.animatedDot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.animatedDot, { backgroundColor: colors.primary }]} />
                </View>
                <View style={[styles.providerIconContainer, { backgroundColor: primaryColor }]}>
                  <Ionicons name={brandIcon as any} size={32} color={textColor} />
                </View>
              </View>

              <Text style={[styles.headingText, { color: colors.text }]}>
                Nekofi wants to connect to {name}
              </Text>
              <Text style={[styles.disclaimerTextSub, { color: colors.textMuted }]}>
                By tapping Allow, you agree to share your data to enable automatic syncing.
              </Text>

              <View style={[styles.permissionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  <View style={styles.permissionTextContainer}>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Account details</Text>
                    <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>Read your account balance and type</Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  <View style={styles.permissionTextContainer}>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Transaction history</Text>
                    <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>Read up to 12 months of transaction history</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.securityNote, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                <Text style={[styles.securityText, { color: colors.textMuted }]}>
                  Nekofi will never see or store your login credentials. Your data is encrypted and securely transmitted.
                </Text>
              </View>

              <View style={styles.actionContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: primaryColor },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleAllowPermission}
                >
                  <Text style={[styles.primaryButtonText, { color: textColor }]}>Allow Connection</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                  <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>Deny</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════
              STEP 1 — Identifier Input
          ═══════════════════════════════════════════ */}
          {connectState === 'identifier' && (
            <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.stepContainerNoPad}>
              <ProviderHeader
                name={name}
                brandIcon={brandIcon}
                primaryColor={primaryColor}
                textColor={textColor}
                subtitle="Secure Verification"
              />

              <View style={styles.formBody}>
                {/* Phone input for phone-type providers */}
                {config.identifierType === 'phone' && (
                  <PhoneNumberInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    onValidityChange={setIdentifierValid}
                    disabled={loading}
                    label={config.identifierLabel}
                    placeholder={config.identifierPlaceholder}
                    accentColor={primaryColor}
                  />
                )}

                {/* Generic text input for username / phone_or_username */}
                {(config.identifierType === 'username' || config.identifierType === 'phone_or_username') && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>{config.identifierLabel}</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                      ]}
                      placeholder={config.identifierPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                )}

                {error && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={15} color={colors.error} />
                    <Text style={[styles.errorMessage, { color: colors.error }]}>{error}</Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: primaryColor },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    (!isIdentifierValid() || loading) && styles.disabledButton,
                  ]}
                  onPress={handleSubmitIdentifier}
                  disabled={!isIdentifierValid() || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={textColor} size="small" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <Text style={[styles.primaryButtonText, { color: textColor }]}>Next</Text>
                      <Ionicons name="arrow-forward" size={18} color={textColor} />
                    </View>
                  )}
                </Pressable>

                <DisclaimerBanner color={primaryColor} colors={colors} />
              </View>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════
              STEP 2 — OTP Verification
          ═══════════════════════════════════════════ */}
          {connectState === 'otp' && (
            <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.stepContainerNoPad}>
              <ProviderHeader
                name={name}
                brandIcon={brandIcon}
                primaryColor={primaryColor}
                textColor={textColor}
                subtitle="Enter Verification Code"
              />

              <View style={styles.formBody}>

                {/* Sent-to message */}
                <View style={styles.sentToBlock}>
                  <Text style={[styles.sentToLabel, { color: colors.textMuted }]}>
                    We sent a verification code to
                  </Text>
                  <Text style={[styles.sentToNumber, { color: colors.text }]}>
                    {maskedIdentifier || identifier}
                  </Text>
                </View>

                {/* OTP boxes */}
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  disabled={loading}
                  length={6}
                />

                {/* Countdown / Resend */}
                <CountdownTimer
                  duration={60}
                  onResend={handleResendOtp}
                  resetKey={otpResetKey}
                  disabled={loading}
                />

                {error && (
                  <Text style={[styles.errorMessage, { color: colors.error }]}>{error}</Text>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { backgroundColor: primaryColor },
                    pressed && { opacity: 0.85 },
                    (otp.length !== 6 || loading) && styles.disabledButton,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={otp.length !== 6 || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={textColor} size="small" />
                  ) : (
                    <Text style={[styles.primaryButtonText, { color: textColor }]}>Verify</Text>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════
              STEP 3 — Verified Animation
          ═══════════════════════════════════════════ */}
          {connectState === 'verified' && (
            <Animated.View entering={ZoomIn} style={styles.centeredFlex}>
              <VerificationSuccess providerName={name} />
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════
              STEP 4 — Mock Account Syncing
          ═══════════════════════════════════════════ */}
          {connectState === 'syncing' && (
            <Animated.View entering={FadeIn} style={styles.syncingContainer}>
              <Text style={[styles.syncingTitle, { color: colors.text }]}>
                Fetching account...
              </Text>
              <Text style={[styles.syncingSubtitle, { color: colors.textMuted }]}>
                This only takes a moment
              </Text>
              <MockLoadingCard
                providerName={name}
                balance={mockBalance}
                step={syncStep}
              />
            </Animated.View>
          )}

          {/* ═══════════════════════════════════════════
              STEP 5 — Success
          ═══════════════════════════════════════════ */}
          {connectState === 'success' && (
            <Animated.View entering={ZoomIn} style={styles.centeredFlex}>
              <View style={[styles.successIconWrapper, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={80} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Successfully Connected</Text>
              <Text style={[styles.successDesc, { color: colors.textMuted }]}>
                Your {name} account is now linked. Redirecting...
              </Text>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Utility ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  backButton: { padding: 4, marginLeft: -4, minWidth: 28 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 18 },
  scrollContent: { flexGrow: 1 },

  stepContainer: { padding: 24, flex: 1 },
  stepContainerNoPad: { flex: 1 },  // header bleeds edge-to-edge, form gets own padding
  centeredFlex: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  formBody: { gap: 18, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // ── Permission ──
  connectionGraphic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  appIconContainer: {
    width: 72, height: 72, borderRadius: 24, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  providerIconContainer: {
    width: 72, height: 72, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  connectionLine: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', width: 60, gap: 8,
  },
  animatedDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.5 },
  headingText: {
    fontFamily: 'Inter-Bold', fontSize: 22,
    textAlign: 'center', marginBottom: 8,
  },
  disclaimerTextSub: {
    fontFamily: 'Inter-Regular', fontSize: 15,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  permissionBox: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  permissionItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  permissionTextContainer: { flex: 1 },
  permissionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, marginBottom: 2 },
  permissionDesc: { fontFamily: 'Inter-Regular', fontSize: 13 },
  divider: { height: 1, marginVertical: 16, marginLeft: 40 },
  securityNote: {
    flexDirection: 'row', padding: 16, borderRadius: 12,
    gap: 12, alignItems: 'center', marginBottom: 8,
  },
  securityText: { fontFamily: 'Inter-Medium', fontSize: 13, flex: 1, lineHeight: 18 },
  actionContainer: { gap: 12, marginTop: 24 },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: { fontFamily: 'Inter-Bold', fontSize: 16 },
  secondaryButton: { paddingVertical: 16, borderRadius: 20, alignItems: 'center' },
  secondaryButtonText: { fontFamily: 'Inter-Medium', fontSize: 16 },
  disabledButton: { opacity: 0.4, shadowOpacity: 0 },

  // ── Disclaimer ──
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  disclaimerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  disclaimerBody: { flex: 1, gap: 2 },
  disclaimerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  disclaimerText: {
    fontFamily: 'Inter-Regular', fontSize: 11, lineHeight: 15,
  },

  // ── Identifier ──
  inputGroup: { gap: 8 },
  inputLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, letterSpacing: 0.1, marginLeft: 2 },
  textInput: {
    height: 60, borderWidth: 1.5, borderRadius: 18,
    paddingHorizontal: 16, fontFamily: 'Inter-Medium', fontSize: 17,
  },
  errorMessage: { fontFamily: 'Inter-Regular', fontSize: 13, flex: 1 },

  // ── OTP ──
  sentToBlock: { alignItems: 'center', gap: 4 },
  sentToLabel: { fontFamily: 'Inter-Regular', fontSize: 14 },
  sentToNumber: { fontFamily: 'Inter-SemiBold', fontSize: 16, letterSpacing: 0.5 },

  // ── Syncing ──
  syncingContainer: {
    flex: 1, paddingTop: 32, paddingBottom: 24, gap: 16, alignItems: 'center',
  },
  syncingTitle: { fontFamily: 'Inter-Bold', fontSize: 22, textAlign: 'center' },
  syncingSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', marginBottom: 8 },

  // ── Success ──
  successIconWrapper: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  successTitle: { fontFamily: 'Inter-Bold', fontSize: 24, marginBottom: 12, textAlign: 'center' },
  successDesc: { fontFamily: 'Inter-Regular', fontSize: 16, textAlign: 'center', lineHeight: 24 },
});
