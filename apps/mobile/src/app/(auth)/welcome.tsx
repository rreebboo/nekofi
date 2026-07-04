import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

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
      <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.hero}>
        <Image source={require('../../../assets/images/icon.png')} style={styles.logo} />
        <Text style={[styles.title, { color: colors.text }]}>Nekofi</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your AI-powered{'\n'}budget companion</Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.actions}>
        <AnimatedPressable style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.secondaryBtn} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>I already have an account</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.secondaryBtn} onPress={handleGuest}>
          <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>Continue as Guest</Text>
        </AnimatedPressable>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingVertical: 80, paddingHorizontal: 24 },
  hero: { alignItems: 'center', gap: 12 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  title: { fontFamily: 'Inter-Bold', fontSize: 48, letterSpacing: -1 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 18, textAlign: 'center', lineHeight: 28 },
  actions: { gap: 12 },
  primaryBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  secondaryBtn: { paddingVertical: 16, alignItems: 'center' },
  secondaryBtnText: { fontFamily: 'Inter-Medium', fontSize: 15 },
});
