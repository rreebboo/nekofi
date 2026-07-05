import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';

interface VerificationSuccessProps {
  providerName?: string;
}

/**
 * Animated ✓ Verified success card shown after OTP is accepted.
 * Pulses in with a scale + opacity animation.
 */
export function VerificationSuccess({ providerName }: VerificationSuccessProps) {
  const colors = useThemeColors();
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
    >
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: colors.success,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          },
        ]}
      />

      {/* Icon circle */}
      <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
        <Ionicons name="checkmark-circle" size={72} color={colors.success} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>✓ Verified</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {providerName ? `${providerName} account confirmed` : 'Identity confirmed'}
      </Text>
      <Text style={[styles.loading, { color: colors.textMuted }]}>
        Loading account data...
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 12,
    padding: 32,
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  loading: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 4,
  },
});
