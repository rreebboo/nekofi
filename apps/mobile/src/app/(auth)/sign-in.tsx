import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/Colors';

/**
 * Sign-in screen with email/password and Supabase Auth.
 */
export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthStore();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={styles.title}>Welcome back 🐱</Text>
      <Text style={styles.subtitle}>Sign in to your Nekofi account</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignIn} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
        <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchLink}>Sign up</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24, paddingTop: 80 },
  title: { fontFamily: 'Inter-Bold', fontSize: 32, color: Colors.text, marginBottom: 8 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textMuted, marginBottom: 40 },
  form: { gap: 16 },
  input: { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  forgotText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.primary, textAlign: 'right' },
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  switchText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 32 },
  switchLink: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
});
