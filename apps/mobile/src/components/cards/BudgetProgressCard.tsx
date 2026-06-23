import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Budget } from '@/types/budget';
import { BudgetCard } from './BudgetCard';
import { Colors } from '@/constants/Colors';

interface Props {
  budgets: Budget[];
}

export function BudgetProgressCard({ budgets }: Props) {
  if (budgets.length === 0) return null;

  return (
    <View>
      <Text style={styles.title}>Budget Progress</Text>
      {budgets.slice(0, 3).map((b) => (
        <BudgetCard key={b.id} budget={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginBottom: 12 },
});
