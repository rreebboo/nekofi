import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { BalanceCard } from '@/components/cards/BalanceCard';
import { SpendingChart } from '@/components/charts/SpendingChart';
import { RecentTransactions } from '@/components/cards/RecentTransactions';
import { AIInsightCard } from '@/components/cards/AIInsightCard';
import { BudgetProgressCard } from '@/components/cards/BudgetProgressCard';
import { Colors } from '@/constants/Colors';

/**
 * Dashboard — main home screen with summary cards and charts.
 */
export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const { transactions, fetchTransactions, loading } = useTransactionStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBudgets(), fetchTransactions()]);
    setRefreshing(false);
  };

  React.useEffect(() => {
    fetchBudgets();
    fetchTransactions();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{user?.name ?? 'User'} 🐱</Text>
        </View>

        {/* Balance Overview */}
        <BalanceCard />

        {/* AI Insight */}
        <AIInsightCard />

        {/* Spending Chart */}
        <SpendingChart transactions={transactions} />

        {/* Budget Progress */}
        <BudgetProgressCard budgets={budgets} />

        {/* Recent Transactions */}
        <RecentTransactions transactions={transactions.slice(0, 5)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
  header: { paddingTop: 16 },
  greeting: { fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.textMuted },
  name: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.text },
});
