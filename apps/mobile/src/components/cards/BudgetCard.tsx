import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Budget } from '@/types/budget';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatCurrency } from '@/utils/formatters';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, useEffect } from 'react-native-reanimated';

interface Props {
  budget: Budget;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Budget card with spending progress bar.
 */
export function BudgetCard({ budget, onPress }: Props) {
  const colors = useThemeColors();
  const percent = Math.min((budget.spent / budget.amount) * 100, 100);
  const isOver = budget.spent > budget.amount;

  const scale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as any,
  }));

  React.useEffect(() => {
    progressWidth.value = withTiming(percent, { duration: 800, easing: Easing.out(Easing.exp) });
  }, [percent]);

  return (
    <AnimatedPressable 
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderAlt }, animatedStyle]} 
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <View style={styles.header}>
        <View style={[styles.emojiContainer, { backgroundColor: `${colors.primary}10` }]}>
          <Text style={styles.emoji}>{budget.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{budget.name}</Text>
          <Text style={[styles.period, { color: colors.textMuted }]}>{budget.period}</Text>
        </View>
        <View>
          <Text style={[styles.amount, { color: isOver ? colors.error : colors.text }]}>
            {formatCurrency(budget.spent, budget.currency)}
          </Text>
          <Text style={[styles.limit, { color: colors.textMuted }]}>/ {formatCurrency(budget.amount, budget.currency)}</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[styles.progressBar, { backgroundColor: isOver ? colors.error : budget.color || colors.primary }, progressStyle]}
        />
      </View>

      <Text style={[styles.remaining, { color: colors.textMuted }]}>
        {isOver
          ? `${formatCurrency(budget.spent - budget.amount, budget.currency)} over budget`
          : `${formatCurrency(budget.amount - budget.spent, budget.currency)} remaining`}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  emojiContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 15, marginBottom: 2 },
  period: { fontFamily: 'Inter-Medium', fontSize: 12, textTransform: 'capitalize' },
  amount: { fontFamily: 'Inter-SemiBold', fontSize: 15, textAlign: 'right' },
  limit: { fontFamily: 'Inter-Regular', fontSize: 12, textAlign: 'right' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  progressBar: { height: '100%', borderRadius: 4 },
  remaining: { fontFamily: 'Inter-Medium', fontSize: 12 },
});
