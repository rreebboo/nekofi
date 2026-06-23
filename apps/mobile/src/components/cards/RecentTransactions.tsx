import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { TransactionItem } from './TransactionItem';
import type { Transaction } from '@/types/transaction';
import { Colors } from '@/constants/Colors';

interface Props {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <Text style={styles.empty}>No transactions yet. Add your first one!</Text>
      ) : (
        transactions.map((t) => (
          <TransactionItem key={t.id} transaction={t} onPress={() => router.push(`/transaction/${t.id}`)} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.primary },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
