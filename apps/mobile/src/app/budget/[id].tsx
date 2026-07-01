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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Budget Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backBtn}>
          <Ionicons name="trash-outline" size={24} color={colors.expense} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.emojiContainer, { backgroundColor: `${budgetGroup.color}15` }]}>
              <Text style={styles.emoji}>{budgetGroup.emoji}</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.budgetName, { color: colors.text }]}>{budgetGroup.name}</Text>
              <Text style={[styles.budgetCategory, { color: colors.textMuted }]}>
                {budgetGroup.period.charAt(0).toUpperCase() + budgetGroup.period.slice(1)} • {new Date(budgetGroup.startDate).toLocaleDateString()} {budgetGroup.endDate && `- ${new Date(budgetGroup.endDate).toLocaleDateString()}`}
              </Text>
            </View>
          </View>

          <View style={styles.amountsRow}>
            <View style={styles.amountCol}>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Spent</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(spent, currency)}</Text>
            </View>
            <View style={[styles.amountCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Remaining</Text>
              <Text style={[styles.amountValue, { color: isOverBudget ? colors.expense : colors.income }]}>
                {formatCurrency(remaining, currency)}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: isOverBudget ? colors.expense : budgetGroup.color,
                    width: `${progressPercent}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {progressPercent.toFixed(1)}% of {formatCurrency(budgetGroup.totalAmount, currency)}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Limits</Text>
        <View style={styles.categoriesList}>
          {budgetGroup.categories.map((cat) => {
            const catInfo = EXPENSE_CATEGORIES.find(e => e.id === cat.category);
            const catTransactions = budgetTransactions.filter(t => t.category === cat.category);
            const catSpent = catTransactions.reduce((acc, t) => acc + t.amount, 0);
            const catProgress = Math.min((catSpent / cat.amount) * 100, 100);
            const catOver = catSpent > cat.amount;

            return (
              <View key={cat.id} style={[styles.catItem, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
                <View style={styles.catItemHeader}>
                  <Text style={styles.catEmoji}>{catInfo?.emoji || '🏷️'}</Text>
                  <Text style={[styles.catName, { color: colors.text }]}>{catInfo?.label || cat.category}</Text>
                  <Text style={[styles.catAmount, { color: catOver ? colors.expense : colors.text }]}>
                    {formatCurrency(catSpent, currency)} / {formatCurrency(cat.amount, currency)}
                  </Text>
                </View>
                <View style={[styles.catProgressBarBg, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.catProgressBarFill, 
                      { 
                        backgroundColor: catOver ? colors.expense : colors.primary,
                        width: `${catProgress}%` 
                      }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>

        <BudgetSpendingChart budget={budgetGroup} transactions={budgetTransactions} />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
        {budgetTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions yet for this budget.</Text>
          </View>
        ) : (
          budgetTransactions.map(t => (
            <TransactionItem key={t.id} transaction={t} />
          ))
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
  backBtn: { padding: 4 },
  title: { fontFamily: 'Inter-Bold', fontSize: 18 },
  content: { padding: 20 },
  summaryCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emoji: { fontSize: 24 },
  cardHeaderText: { flex: 1 },
  budgetName: { fontFamily: 'Inter-Bold', fontSize: 20, marginBottom: 2 },
  budgetCategory: { fontFamily: 'Inter-Medium', fontSize: 13, textTransform: 'capitalize' },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountCol: {},
  amountLabel: { fontFamily: 'Inter-Medium', fontSize: 13, marginBottom: 4 },
  amountValue: { fontFamily: 'Inter-Bold', fontSize: 18 },
  progressContainer: {},
  progressBarBg: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: { fontFamily: 'Inter-Medium', fontSize: 12, textAlign: 'right' },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 16 },
  categoriesList: { marginBottom: 24, gap: 12 },
  catItem: { padding: 16, borderRadius: 16, borderWidth: 1 },
  catItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catEmoji: { fontSize: 20, marginRight: 12 },
  catName: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15 },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: 14 },
  catProgressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catProgressBarFill: { height: '100%', borderRadius: 3 },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14 },
});
