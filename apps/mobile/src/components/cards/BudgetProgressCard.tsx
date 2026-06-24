import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Budget } from '@/types/budget';
import { BudgetCard } from './BudgetCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Props {
  budgets: Budget[];
}

export function BudgetProgressCard({ budgets }: Props) {
  const colors = useThemeColors();
  if (budgets.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Budget Progress</Text>
      {budgets.slice(0, 3).map((b, index) => (
        <Animated.View key={b.id} entering={FadeInDown.delay(index * 100).springify()}>
          <BudgetCard budget={b} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 16, marginBottom: 16 },
});
