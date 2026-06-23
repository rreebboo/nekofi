import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Budget } from '@/types/budget';
import { Colors } from '@/constants/Colors';
import { formatCurrency } from '@/utils/formatters';

interface Props {
  budget: Budget;
  onPress?: () => void;
}

/**
 * Budget card with spending progress bar.
 */
export function BudgetCard({ budget, onPress }: Props) {
  const percent = Math.min((budget.spent / budget.amount) * 100, 100);
  const isOver = budget.spent > budget.amount;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{budget.emoji}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{budget.name}</Text>
          <Text style={styles.period}>{budget.period}</Text>
        </View>
        <View>
          <Text style={[styles.amount, isOver && { color: Colors.error }]}>
            {formatCurrency(budget.spent, budget.currency)}
          </Text>
          <Text style={styles.limit}>/ {formatCurrency(budget.amount, budget.currency)}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressBar, { width: `${percent}%` as any, backgroundColor: isOver ? Colors.error : budget.color || Colors.primary }]}
        />
      </View>

      <Text style={styles.remaining}>
        {isOver
          ? `${formatCurrency(budget.spent - budget.amount, budget.currency)} over budget`
          : `${formatCurrency(budget.amount - budget.spent, budget.currency)} remaining`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  emoji: { fontSize: 28 },
  info: { flex: 1 },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  period: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted, textTransform: 'capitalize' },
  amount: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, textAlign: 'right' },
  limit: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', borderRadius: 4 },
  remaining: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted },
});
