import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { TransactionItem } from '@/components/cards/TransactionItem';
import { BudgetSpendingChart } from '@/components/charts/BudgetSpendingChart';
import { formatCurrency } from '@/utils/formatters';

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();
  
  const budget = useBudgetStore((state) => state.budgets.find((b) => b.id === id));
  const deleteBudget = useBudgetStore((state) => state.deleteBudget);
  const transactions = useTransactionStore((state) => state.transactions);

  const budgetTransactions = useMemo(() => {
    if (!budget) return [];
    if (budget.category === 'general') {
      return transactions.filter(t => t.type === 'expense');
    }
    return transactions.filter(t => t.type === 'expense' && t.category === budget.category);
  }, [transactions, budget]);

  const spent = useMemo(() => {
    return budgetTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [budgetTransactions]);

  if (!budget) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Budget not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remaining = Math.max(budget.amount - spent, 0);
  const progressPercent = Math.min((spent / budget.amount) * 100, 100);
  const isOverBudget = spent > budget.amount;

  const handleDelete = () => {
    Alert.alert('Delete Budget', 'Are you sure you want to delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          await deleteBudget(budget.id);
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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.emojiContainer, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={styles.emoji}>{budget.emoji}</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.budgetName, { color: colors.text }]}>{budget.name}</Text>
              <Text style={[styles.budgetCategory, { color: colors.textMuted }]}>
                {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} • {new Date(budget.startDate).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.amountsRow}>
            <View style={styles.amountCol}>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Spent</Text>
              <Text style={[styles.amountValue, { color: colors.text }]}>{formatCurrency(spent, budget.currency)}</Text>
            </View>
            <View style={[styles.amountCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Remaining</Text>
              <Text style={[styles.amountValue, { color: isOverBudget ? colors.expense : colors.income }]}>
                {formatCurrency(remaining, budget.currency)}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    backgroundColor: isOverBudget ? colors.expense : colors.primary,
                    width: `${progressPercent}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {progressPercent.toFixed(1)}% of {formatCurrency(budget.amount, budget.currency)}
            </Text>
          </View>
        </View>

        <BudgetSpendingChart budget={budget} transactions={budgetTransactions} />

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
  placeholder: { width: 32 },
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
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontFamily: 'Inter-Medium', fontSize: 14 },
});
