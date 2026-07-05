import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BudgetGroup } from '@/types/budget';
import { BudgetCard } from './BudgetCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Props {
  budgetGroups: BudgetGroup[];
}

export function BudgetProgressCard({ budgetGroups }: Props) {
  const colors = useThemeColors();
  if (budgetGroups.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Budget Progress</Text>
      {budgetGroups.slice(0, 3).map((b, index) => (
        <Animated.View key={b.name} entering={FadeInDown.delay(index * 100).springify()}>
          <BudgetCard budget={b} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: moderateScale(12) },
  title: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16), marginBottom: moderateScale(16) },
});
