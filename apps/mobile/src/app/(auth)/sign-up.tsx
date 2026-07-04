import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SocialAuthButton } from '@/components/ui/SocialAuthButton';

/**
 * Sign-up screen — creates a new Supabase user.
 */
export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const { signUp, signInWithFacebook, syncConflict } = useAuthStore();
  const colors = useThemeColors();

  React.useEffect(() => {
    if (isResolvingConflict && !syncConflict) {
      Alert.alert('Success', 'Check your email to verify your account!');
      router.replace('/(auth)/sign-in');
    }
  }, [isResolvingConflict, syncConflict]);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const wasGuest = useAuthStore.getState().isGuest;
      useAuthStore.getState().setIsCheckingConflict(true);
      await signUp(email, password, name);
      
      let hasConflict = false;
      if (wasGuest) {
        const { checkAndHandleSyncConflict } = require('@/services/syncService');
        hasConflict = await checkAndHandleSyncConflict();
      }
      useAuthStore.getState().setIsCheckingConflict(false);

      if (hasConflict) {
        setIsResolvingConflict(true);
      } else {
        Alert.alert('Success', 'Check your email to verify your account!');
        router.replace('/(auth)/sign-in');
      }
    } catch (err: any) {
      useAuthStore.getState().setIsCheckingConflict(false);
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles Facebook OAuth sign-up / sign-in.
   * If this is a brand-new Facebook account, Supabase creates the user automatically.
   * If they already have a Supabase account linked to this Facebook ID, they are signed in.
   */
  const handleFacebookSignIn = async () => {
    setFbLoading(true);
    try {
      await signInWithFacebook();
      // Auth layout useEffect will navigate to /(tabs) once session is set in the store.
    } catch (err: any) {
      if (!err.message?.includes('cancelled')) {
        Alert.alert('Facebook Sign Up Failed', err.message);
      }
    } finally {
      setFbLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Join Nekofi and take control of your finances</Text>

      <View style={styles.form}>
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} placeholder="Full Name" placeholderTextColor={colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} placeholder="Password (min 8 chars)" placeholderTextColor={colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Divider ─────────────────────────────────────────── */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textMuted }]}>or sign up with</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* ── Facebook Sign-Up Button ───────────────────────── */}
      <SocialAuthButton
        provider="facebook"
        onPress={handleFacebookSignIn}
        loading={fbLoading}
        disabled={loading}
        style={styles.socialBtn}
      />

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={[styles.switchText, { color: colors.textMuted }]}>Already have an account? <Text style={[styles.switchLink, { color: colors.primary }]}>Sign in</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80 },
  title: { fontFamily: 'Inter-Bold', fontSize: 32, marginBottom: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, marginBottom: 40 },
  form: { gap: 16 },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
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
