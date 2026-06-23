import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Transaction } from '@/types/transaction';
import { Colors } from '@/constants/Colors';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

/**
 * Single transaction row card.
 */
export function TransactionItem({ transaction, onPress }: Props) {
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? Colors.income : Colors.expense;
  const amountPrefix = isIncome ? '+' : '-';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
          size={28}
          color={amountColor}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.description} numberOfLines={1}>{transaction.description}</Text>
        <Text style={styles.category}>{transaction.category} · {formatDate(transaction.date)}</Text>
      </View>

      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{formatCurrency(transaction.amount, transaction.currency)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  iconContainer: { marginRight: 12 },
  info: { flex: 1 },
  description: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginBottom: 2 },
  category: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted },
  amount: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
});
