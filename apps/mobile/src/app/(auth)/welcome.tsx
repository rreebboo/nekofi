import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '@/hooks/useThemeColors';

import { useAuthStore } from '@/stores/authStore';

/**
 * Welcome / onboarding screen.
 */
export default function WelcomeScreen() {
  const colors = useThemeColors();
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);

  const handleGuest = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={[colors.background, colors.surface]} style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🐱</Text>
        <Text style={[styles.title, { color: colors.text }]}>Nekofi</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your AI-powered{'\n'}budget companion</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>I already have an account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleGuest}>
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Continue as Guest</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: 24 },
  hero: { alignItems: 'center', gap: 12 },
  emoji: { fontSize: 72 },
  title: { fontFamily: 'Inter-Bold', fontSize: 48, letterSpacing: -1 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 18, textAlign: 'center', lineHeight: 28 },
  actions: { gap: 12 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  secondaryBtn: { paddingVertical: 16, alignItems: 'center' },
  secondaryBtnText: { fontFamily: 'Inter-Medium', fontSize: 15 },
});
