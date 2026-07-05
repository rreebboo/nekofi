import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { BudgetGroup } from '@/types/budget';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatCurrency } from '@/utils/formatters';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Props {
  budget: BudgetGroup;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Budget card with spending progress bar.
 */
export function BudgetCard({ budget, onPress }: Props) {
  const colors = useThemeColors();
  const percent = Math.min((budget.totalSpent / budget.totalAmount) * 100, 100);
  const isOver = budget.totalSpent > budget.totalAmount;
  const currency = budget.categories[0]?.currency || 'PHP';

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
            {formatCurrency(budget.totalSpent, currency)}
          </Text>
          <Text style={[styles.limit, { color: colors.textMuted }]}>/ {formatCurrency(budget.totalAmount, currency)}</Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[styles.progressBar, { backgroundColor: isOver ? colors.error : budget.color || colors.primary }, progressStyle]}
        />
      </View>

      <Text style={[styles.remaining, { color: colors.textMuted }]}>
        {isOver
          ? `${formatCurrency(budget.totalSpent - budget.totalAmount, currency)} over budget`
          : `${formatCurrency(budget.totalAmount - budget.totalSpent, currency)} remaining`}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: moderateScale(20), padding: moderateScale(16), borderWidth: 1, marginBottom: moderateScale(12) },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(16), gap: moderateScale(12) },
  emojiContainer: { width: scale(44), height: verticalScale(44), borderRadius: moderateScale(22), alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: moderateScale(24) },
  info: { flex: 1 },
  name: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15), marginBottom: moderateScale(2) },
  period: { fontFamily: 'Inter-Medium', fontSize: moderateScale(12), textTransform: 'capitalize' },
  amount: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15), textAlign: 'right' },
  limit: { fontFamily: 'Inter-Regular', fontSize: moderateScale(12), textAlign: 'right' },
  progressTrack: { height: verticalScale(8), borderRadius: moderateScale(4), overflow: 'hidden', marginBottom: moderateScale(10) },
  progressBar: { height: '100%', borderRadius: moderateScale(4) },
  remaining: { fontFamily: 'Inter-Medium', fontSize: moderateScale(12) },
});
