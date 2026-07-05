import React from 'react';
import { View, Text, StyleSheet, RefreshControl, Image } from 'react-native';
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
import Animated, { FadeInDown, useAnimatedRef } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useFabScrollOffset } from '@/contexts/FabContext';
import { NekofiCompanion } from '@/components/NekofiCompanion';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

/**
 * Dashboard — main home screen with summary cards and charts.
 */
export default function DashboardScreen() {
  const { user } = useAuthStore();
  const { budgets, fetchBudgets } = useBudgetStore();
  const { transactions, fetchTransactions, loading } = useTransactionStore();
  const budgetGroups = React.useMemo(() => computeBudgetGroups(budgets, transactions), [budgets, transactions]);
  const [refreshing, setRefreshing] = React.useState(false);
  const colors = useThemeColors();
  
  const scrollRef = useAnimatedRef<Animated.FlatList<any>>();
  useFabScrollOffset(scrollRef);

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
      {/* Sticky Header / Companion */}
      <View style={styles.header}>
        <NekofiCompanion />
      </View>

      <Animated.FlatList
        ref={scrollRef}
        data={[]}
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
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
              <View style={{ height: verticalScale(100) }} />
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: moderateScale(32) },
  header: { paddingTop: moderateScale(8), paddingBottom: moderateScale(8), paddingHorizontal: moderateScale(20), zIndex: 10 },
  greeting: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14), marginBottom: moderateScale(4) },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(10) },
  nameLogo: { width: moderateScale(32), height: moderateScale(32), borderRadius: moderateScale(8) },
  name: { fontFamily: 'Inter-Bold', fontSize: moderateScale(28), letterSpacing: -0.5 },
  carouselWrapper: {
    marginVertical: moderateScale(8),
  },
  contentPad: {
    paddingHorizontal: moderateScale(20),
    gap: moderateScale(16),
  },
});
