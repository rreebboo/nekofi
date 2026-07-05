import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProviderHeaderProps {
  name: string;
  brandIcon: string;
  primaryColor: string;
  textColor: string;
  subtitle?: string;
}

/**
 * Immersive provider header with decorative depth rings and a lock badge.
 */
export function ProviderHeader({
  name,
  brandIcon,
  primaryColor,
  textColor,
  subtitle = 'Secure Verification',
}: ProviderHeaderProps) {
  // Derive a slightly darker shade for depth
  return (
    <View style={[styles.container, { backgroundColor: primaryColor }]}>
      {/* Decorative background circles for depth */}
      <View style={[styles.decorCircle1, { borderColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={[styles.decorCircle2, { borderColor: 'rgba(255,255,255,0.06)' }]} />
      <View style={[styles.decorCircle3, { borderColor: 'rgba(255,255,255,0.04)' }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Icon with frosted ring */}
        <View style={[styles.iconRing, { borderColor: 'rgba(255,255,255,0.25)' }]}>
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Ionicons name={brandIcon as any} size={36} color={textColor} />
          </View>
        </View>

        <Text style={[styles.name, { color: textColor }]}>{name}</Text>

        {/* Subtitle pill */}
        <View style={[styles.subtitlePill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Ionicons name="lock-closed" size={11} color={textColor} style={{ opacity: 0.9 }} />
          <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  // Decorative concentric rings
  decorCircle1: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    top: -60,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    top: -30,
    right: -20,
  },
  decorCircle3: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    bottom: -160,
    left: -80,
  },

  content: {
    alignItems: 'center',
    gap: 10,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  subtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    opacity: 0.9,
    letterSpacing: 0.3,
  },
});
