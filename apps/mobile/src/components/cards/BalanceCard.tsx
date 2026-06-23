import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTransactionStore } from '@/stores/transactionStore';
import { Colors } from '@/constants/Colors';
import { formatCurrency } from '@/utils/formatters';

/**
 * Total balance overview card — shown on the dashboard.
 */
export function BalanceCard() {
  const { transactions } = useTransactionStore();

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <LinearGradient colors={['#7C6BFF', '#A855F7']} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={styles.label}>Total Balance</Text>
      <Text style={styles.balance}>{formatCurrency(balance, 'PHP')}</Text>

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>↑ Income</Text>
          <Text style={styles.statValue}>{formatCurrency(totalIncome, 'PHP')}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>↓ Expense</Text>
          <Text style={styles.statValue}>{formatCurrency(totalExpense, 'PHP')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 24, marginTop: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  balance: { fontFamily: 'Inter-Bold', fontSize: 40, color: '#fff', letterSpacing: -1, marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  statValue: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  divider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 },
});
