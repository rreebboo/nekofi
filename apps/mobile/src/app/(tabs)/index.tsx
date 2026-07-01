import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { BalanceCard } from '@/components/cards/BalanceCard';
import { SpendingChart } from '@/components/charts/SpendingChart';
import { RecentTransactions } from '@/components/cards/RecentTransactions';
import { AIInsightCard } from '@/components/cards/AIInsightCard';
import { BudgetProgressCard } from '@/components/cards/BudgetProgressCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { HomeCarousel } from '@/components/ui/HomeCarousel';
import * as Haptics from 'expo-haptics';

/**
 * Dashboard — main home screen with summary cards and charts.
 */
export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const budgetGroups = React.useMemo(() => computeBudgetGroups(budgets), [budgets]);
  const { transactions, fetchTransactions, loading } = useTransactionStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const colors = useThemeColors();

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()},</Text>
          <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? 'User'} 🐱</Text>
        </View>

        {/* Credit Card Carousel Section */}
        <View style={styles.carouselWrapper}>
          <BalanceCard />
        </View>

        <View style={styles.contentPad}>
          {/* Main Sections */}
          <AIInsightCard />
          <BudgetProgressCard budgetGroups={budgetGroups} />
          {/* Spending Chart */}
          <SpendingChart transactions={transactions} />

          {/* Recent Transactions */}
          <RecentTransactions transactions={transactions.slice(0, 5)} />
          
          {/* Spacer for Floating Nav Bar */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 32 },
  header: { paddingTop: 16, paddingBottom: 8, paddingHorizontal: 20 },
  greeting: { fontFamily: 'Inter-Medium', fontSize: 14, marginBottom: 4 },
  name: { fontFamily: 'Inter-Bold', fontSize: 28, letterSpacing: -0.5 },
  carouselWrapper: {
    marginVertical: 8,
  },
  contentPad: {
    paddingHorizontal: 20,
    gap: 16,
  },
});
