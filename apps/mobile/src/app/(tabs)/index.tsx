import React from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@/stores/notificationStore';
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

  const unreadCount = useNotificationStore((state) => state.unreadCount);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([
      fetchBudgets(),
      fetchTransactions(),
      useNotificationStore.getState().fetchNotifications()
    ]);
    setRefreshing(false);
  };

  React.useEffect(() => {
    fetchBudgets();
    fetchTransactions();
    useNotificationStore.getState().fetchNotifications();
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
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{greeting()},</Text>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? 'User'} 🐱</Text>
          </View>
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications');
            }}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
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
          <View style={{ height: verticalScale(100) }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: moderateScale(32) },
  header: { paddingTop: moderateScale(16), paddingBottom: moderateScale(8), paddingHorizontal: moderateScale(20) },
  greeting: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14), marginBottom: moderateScale(4) },
  name: { fontFamily: 'Inter-Bold', fontSize: moderateScale(28), letterSpacing: -0.5 },
  scroll: { paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#FFF',
    textAlign: 'center',
  },
  greeting: { fontFamily: 'Inter-Medium', fontSize: 14, marginBottom: 4 },
  name: { fontFamily: 'Inter-Bold', fontSize: 28, letterSpacing: -0.5 },
  carouselWrapper: {
    marginVertical: moderateScale(8),
  },
  contentPad: {
    paddingHorizontal: moderateScale(20),
    gap: moderateScale(16),
  },
});
