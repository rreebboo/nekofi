import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface MockLoadingCardProps {
  providerName: string;
  /** Optional mock balance to show once "loaded" */
  balance?: string;
  step?: 'connecting' | 'fetching' | 'importing';
}

const STEP_LABELS: Record<NonNullable<MockLoadingCardProps['step']>, string> = {
  connecting: 'Establishing secure connection...',
  fetching: 'Fetching account data...',
  importing: 'Importing transactions...',
};

const STEP_PROGRESS: Record<NonNullable<MockLoadingCardProps['step']>, number> = {
  connecting: 0.3,
  fetching: 0.65,
  importing: 0.9,
};

/**
 * Animated loading card shown during the mock "account sync" phase.
 * Displays current sync step and a progress bar.
 */
export function MockLoadingCard({
  providerName,
  balance,
  step = 'connecting',
}: MockLoadingCardProps) {
  const colors = useThemeColors();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: STEP_PROGRESS[step],
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // Shimmer loop
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Provider badge */}
      <View style={styles.header}>
        <View style={[styles.providerBadge, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.providerName, { color: colors.text }]}>{providerName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.primary }]}>Syncing</Text>
        </View>
      </View>

      {/* Shimmer balance placeholder */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Account Balance</Text>
        {balance ? (
          <Text style={[styles.balanceValue, { color: colors.text }]}>{balance}</Text>
        ) : (
          <View style={[styles.shimmerBar, { backgroundColor: colors.surfaceAlt, width: 160, height: 32 }]}>
            <Animated.View
              style={[
                styles.shimmerHighlight,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Step label */}
      <Text style={[styles.stepLabel, { color: colors.textMuted }]}>
        {STEP_LABELS[step]}
      </Text>

      {/* Shimmer rows for transactions */}
      <View style={styles.txRows}>
        {[140, 120, 100].map((w, i) => (
          <View
            key={i}
            style={[styles.shimmerRow, { backgroundColor: colors.surfaceAlt }]}
          >
            <View style={[styles.shimmerCircle, { backgroundColor: colors.borderAlt }]} />
            <View style={[styles.shimmerBarSmall, { backgroundColor: colors.borderAlt, width: w }]}>
              <Animated.View
                style={[
                  styles.shimmerHighlight,
                  { transform: [{ translateX: shimmerTranslate }] },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  providerName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  balanceSection: {
    gap: 4,
  },
  balanceLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  balanceValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  shimmerBar: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  shimmerHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  txRows: {
    gap: 10,
  },
  shimmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 12,
  },
  shimmerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  shimmerBarSmall: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
});
