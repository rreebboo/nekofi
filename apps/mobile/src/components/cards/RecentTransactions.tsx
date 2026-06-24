import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { TransactionItem } from './TransactionItem';
import type { Transaction } from '@/types/transaction';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Props {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Manage Expenses</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
          <Text style={[styles.seeAll, { color: colors.textMuted }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>No transactions yet. Add your first one!</Text>
      ) : (
        transactions.map((t, index) => (
          <Animated.View key={t.id} entering={FadeInDown.delay(index * 100).springify()}>
            <TransactionItem transaction={t} onPress={() => router.push(`/transaction/${t.id}`)} />
          </Animated.View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 16 },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 13 },
  empty: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
