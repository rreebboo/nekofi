import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { BudgetCard } from '@/components/cards/BudgetCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Budgets overview screen.
 */
export default function BudgetsScreen() {
  const { budgets, fetchBudgets } = useBudgetStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const budgetGroups = React.useMemo(() => computeBudgetGroups(budgets, transactions), [budgets, transactions]);
  const colors = useThemeColors();

  useEffect(() => { 
    fetchBudgets(); 
    fetchTransactions();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Budgets</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]} onPress={() => router.push('/budget/create')}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgetGroups}
        keyExtractor={(b) => b.name}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <BudgetCard budget={item} onPress={() => router.push(`/budget/${encodeURIComponent(item.name)}`)} />
          </Animated.View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 100 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No budgets yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Create a budget to start tracking your spending goals.</Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/budget/create')}>
              <Text style={styles.createBtnText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28 },
  addBtn: { borderRadius: 16, padding: 10, borderWidth: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 20 },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  createBtn: { marginTop: 16, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 },
  createBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
