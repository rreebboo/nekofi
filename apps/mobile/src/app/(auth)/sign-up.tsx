import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/Colors';

/**
 * Sign-up screen — creates a new Supabase user.
 */
export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();

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
      await signUp(email, password, name);
      Alert.alert('Success', 'Check your email to verify your account!');
      router.replace('/(auth)/sign-in');
    } catch (err: any) {
      Alert.alert('Sign Up Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join Nekofi and take control of your finances</Text>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password (min 8 chars)" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.switchText}>Already have an account? <Text style={styles.switchLink}>Sign in</Text></Text>
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
  btn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  switchText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 32 },
  switchLink: { color: Colors.primary, fontFamily: 'Inter-SemiBold' },
});
