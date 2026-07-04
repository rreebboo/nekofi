import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { supabase } from '@/services/supabase/client';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();

  const handleReset = async () => {
    if (!email) { Alert.alert('Error', 'Please enter your email.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'nekofi://reset-password',
      });
      if (error) throw error;
      Alert.alert('Email Sent', 'Check your inbox for the password reset link.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>We'll send a reset link to your email.</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} placeholder="Email" placeholderTextColor={colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <AnimatedPressable style={[styles.btn, { backgroundColor: colors.primary }, loading && styles.btnDisabled]} onPress={handleReset} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </AnimatedPressable>
      <AnimatedPressable onPress={() => router.back()}>
        <Text style={[styles.backText, { color: colors.primary }]}>← Back to sign in</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 80, gap: 16 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 14, marginBottom: 8 },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
  btn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  backText: { fontFamily: 'Inter-Medium', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
