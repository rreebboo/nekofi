import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { TransactionItem } from '@/components/cards/TransactionItem';
import { BudgetSpendingChart } from '@/components/charts/BudgetSpendingChart';
import { formatCurrency } from '@/utils/formatters';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  
  const name = decodeURIComponent(id as string);
  const budgets = useBudgetStore((state) => state.budgets);
  const transactions = useTransactionStore((state) => state.transactions);
  const budgetGroup = useMemo(() => computeBudgetGroups(budgets, transactions).find(bg => bg.name === name), [budgets, transactions, name]);
  
  const deleteBudgetGroup = useBudgetStore((state) => state.deleteBudgetGroup);

  const budgetTransactions = useMemo(() => {
    if (!budgetGroup) return [];
    
    const start = new Date(budgetGroup.startDate);
    const end = budgetGroup.endDate ? new Date(budgetGroup.endDate) : new Date(8640000000000000);
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (tDate < start || tDate > end) return false;
      if (t.type !== 'expense') return false;
      return budgetGroup.categories.some(cat => cat.category === t.category);
    });
  }, [transactions, budgetGroup]);

  const spent = useMemo(() => {
    return budgetTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [budgetTransactions]);

  if (!budgetGroup) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Budget not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remaining = Math.max(budgetGroup.totalAmount - spent, 0);
  const progressPercent = Math.min((spent / budgetGroup.totalAmount) * 100, 100);
  const isOverBudget = spent > budgetGroup.totalAmount;
  const currency = budgetGroup.categories[0]?.currency || 'PHP';
  const displayColor = budgetGroup.color || colors.primary;

  const handleDelete = () => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          await deleteBudgetGroup(budgetGroup.name);
          router.back();
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Budget Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={24} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Theme-based Hero Card */}
        <Animated.View entering={FadeInDown} layout={Layout.springify()} style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleContainer}>
              <Text style={[styles.heroBudgetName, { color: colors.text }]} numberOfLines={1}>{budgetGroup.name}</Text>
              <Text style={[styles.heroBudgetPeriod, { color: colors.textMuted }]}>
                {budgetGroup.period.charAt(0).toUpperCase() + budgetGroup.period.slice(1)} • {new Date(budgetGroup.startDate).toLocaleDateString()} {budgetGroup.endDate && `- ${new Date(budgetGroup.endDate).toLocaleDateString()}`}
              </Text>
            </View>
          </View>

          <View style={[styles.heroDivider, { backgroundColor: colors.borderAlt }]} />

          <View style={styles.heroAmountsRow}>
            <View style={styles.heroAmountCol}>
              <Text style={[styles.heroAmountLabel, { color: colors.textMuted }]}>SPENT</Text>
              <Text style={[styles.heroAmountValue, { color: colors.text }]}>{formatCurrency(spent, currency)}</Text>
            </View>
            <View style={[styles.heroAmountCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.heroAmountLabel, { color: colors.textMuted }]}>REMAINING</Text>
              <Text style={[styles.heroAmountValue, isOverBudget && { color: colors.error }, !isOverBudget && { color: colors.text }]}>
                {formatCurrency(remaining, currency)}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.borderAlt }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: isOverBudget ? colors.error : displayColor,
                    width: `${progressPercent}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {progressPercent.toFixed(1)}% of {formatCurrency(budgetGroup.totalAmount, currency)}
            </Text>
          </View>
        </Animated.View>

        {/* Category Limits */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Allocations</Text>
        </View>
        <View style={styles.categoriesList}>
          {budgetGroup.categories.map((cat, index) => {
            const catInfo = EXPENSE_CATEGORIES.find(e => e.id === cat.category);
            const catTransactions = budgetTransactions.filter(t => t.category === cat.category);
            const catSpent = catTransactions.reduce((acc, t) => acc + t.amount, 0);
            const catProgress = Math.min((catSpent / cat.amount) * 100, 100);
            const catOver = catSpent > cat.amount;

            return (
              <Animated.View 
                key={cat.id} 
                entering={FadeInDown.delay(index * 50).springify()}
                style={[styles.catItem, { backgroundColor: colors.surface }]}
              >
                <View style={styles.catItemHeader}>
                  <View style={[styles.catIconContainer, { backgroundColor: colors.background }]}>
                    <Text style={styles.catEmoji}>{catInfo?.emoji || '🏷️'}</Text>
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catName, { color: colors.text }]}>{catInfo?.label || cat.category}</Text>
                    <Text style={[styles.catAmount, { color: catOver ? colors.expense : displayColor }]}>
                      {formatCurrency(catSpent, currency)} / {formatCurrency(cat.amount, currency)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.catProgressBarBg, { backgroundColor: colors.background }]}>
                  <View 
                    style={[
                      styles.catProgressBarFill, 
                      { 
                        backgroundColor: catOver ? colors.expense : displayColor,
                        width: `${catProgress}%` 
                      }
                    ]} 
                  />
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* Chart */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <BudgetSpendingChart budget={budgetGroup} transactions={budgetTransactions} />
        </Animated.View>

        {/* Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
        </View>
        
        {budgetTransactions.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(400)} style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet for this budget.</Text>
          </Animated.View>
        ) : (
          <View style={styles.transactionsContainer}>
            {budgetTransactions.map((t, index) => (
              <Animated.View key={t.id} entering={FadeInDown.delay(400 + (index * 50)).springify()}>
                <TransactionItem transaction={t} />
              </Animated.View>
            ))}
          </View>
        )}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerBtn: { padding: 4, width: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter-Bold', fontSize: 18 },
  content: { padding: 16, paddingBottom: 60 },
  
  heroCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitleContainer: { flex: 1 },
  heroBudgetName: { fontFamily: 'Inter-Bold', fontSize: 22, marginBottom: 2 },
  heroBudgetPeriod: { fontFamily: 'Inter-Medium', fontSize: 12, textTransform: 'capitalize' },
  heroDivider: { height: 1, marginVertical: 16 },
  heroAmountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  heroAmountCol: { flex: 1 },
  heroAmountLabel: { fontFamily: 'Inter-SemiBold', fontSize: 11, marginBottom: 4, letterSpacing: 0.5 },
  heroAmountValue: { fontFamily: 'Inter-Bold', fontSize: 20 },
  
  progressContainer: { marginTop: 4 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontFamily: 'Inter-Medium', fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  
  sectionHeader: { marginBottom: 16, marginTop: 8, paddingHorizontal: 4 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 20 },
  
  categoriesList: { marginBottom: 24, gap: 12 },
  catItem: { padding: 16, borderRadius: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  catItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  catIconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catEmoji: { fontSize: 22 },
  catInfo: { flex: 1 },
  catName: { fontFamily: 'Inter-Medium', fontSize: 16, marginBottom: 2 },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: 14 },
  catProgressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catProgressBarFill: { height: '100%', borderRadius: 4 },
  
  transactionsContainer: { gap: 8, marginTop: 4 },
  emptyState: { padding: 32, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center' },
});
