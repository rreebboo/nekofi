import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';

/**
 * Welcome / onboarding screen.
 */
export default function WelcomeScreen() {
  return (
    <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🐱</Text>
        <Text style={styles.title}>Nekofi</Text>
        <Text style={styles.subtitle}>Your AI-powered{'\n'}budget companion</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: 24 },
  hero: { alignItems: 'center', gap: 12 },
  emoji: { fontSize: 72 },
  title: { fontFamily: 'Inter-Bold', fontSize: 48, color: Colors.text, letterSpacing: -1 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 18, color: Colors.textMuted, textAlign: 'center', lineHeight: 28 },
  actions: { gap: 12 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  secondaryBtn: { paddingVertical: 16, alignItems: 'center' },
  secondaryBtnText: { fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.textMuted },
});
