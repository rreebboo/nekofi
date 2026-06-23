import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase/client';
import { Colors } from '@/constants/Colors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

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
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>We'll send a reset link to your email.</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleReset} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backText}>← Back to sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, paddingTop: 80, gap: 16 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  backText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.primary, textAlign: 'center', marginTop: 8 },
});
