import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { checkAndHandleSyncConflict } from '@/services/syncService';
import { SocialAuthButton } from '@/components/ui/SocialAuthButton';

/**
 * Sign-in screen with email/password and Supabase Auth.
 */
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const { signIn, signInWithFacebook, syncConflict } = useAuthStore();
  const colors = useThemeColors();

  React.useEffect(() => {
    if (isResolvingConflict && !syncConflict) {
      router.replace('/(tabs)');
    }
  }, [isResolvingConflict, syncConflict]);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const wasGuest = useAuthStore.getState().isGuest;
      useAuthStore.getState().setIsCheckingConflict(true);
      await signIn(email, password);

      let hasConflict = false;
      if (wasGuest) {
        hasConflict = await checkAndHandleSyncConflict();
      }
      useAuthStore.getState().setIsCheckingConflict(false);

      if (hasConflict) {
        setIsResolvingConflict(true);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      useAuthStore.getState().setIsCheckingConflict(false);
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles Facebook OAuth sign-in.
   * If the account is new, Supabase auto-creates it.
   * If it already exists, the user is signed in.
   */
  const handleFacebookSignIn = async () => {
    setFbLoading(true);
    try {
      await signInWithFacebook();
      // signInWithFacebook sets the session in the store;
      // the auth layout's useEffect will redirect to /(tabs) automatically.
    } catch (err: any) {
      // Don't show an alert for user-cancelled flows
      if (!err.message?.includes('cancelled')) {
        Alert.alert('Facebook Sign In Failed', err.message);
      }
    } finally {
      setFbLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome back 🐱</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to your Nekofi account</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <AnimatedPressable onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
          </AnimatedPressable>

          <AnimatedPressable style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]} onPress={handleSignIn} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </AnimatedPressable>
        </View>

        {/* ── Divider ─────────────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or continue with</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Facebook Sign-In Button ───────────────────────── */}
        <SocialAuthButton
          provider="facebook"
          onPress={handleFacebookSignIn}
          loading={fbLoading}
          disabled={loading}
          style={styles.socialBtn}
        />

        <AnimatedPressable onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={[styles.switchText, { color: colors.textMuted }]}>Don't have an account? <Text style={[styles.switchLink, { color: colors.primary }]}>Sign up</Text></Text>
        </AnimatedPressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80 },
  title: { fontFamily: 'Inter-Bold', fontSize: 32, marginBottom: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, marginBottom: 40 },
  form: { gap: 16 },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
  forgotText: { fontFamily: 'Inter-Medium', fontSize: 13, textAlign: 'right' },
  btn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Inter-Regular', fontSize: 12, marginHorizontal: 12 },
  // Social
  socialBtn: { marginTop: 16 },
  // Footer
  switchText: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', marginTop: 32 },
  switchLink: { fontFamily: 'Inter-SemiBold' },
});
