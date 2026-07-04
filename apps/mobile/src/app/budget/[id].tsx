import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { supabase } from '@/services/supabase/client';
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
  const { budgets, deleteBudgetGroup, collaborators, fetchCollaborators, inviteUser, removeCollaborator } = useBudgetStore();
  const transactions = useTransactionStore((state) => state.transactions);
  const budgetGroup = useMemo(() => computeBudgetGroups(budgets, transactions).find(bg => bg.name === name), [budgets, transactions, name]);

  const [inviteModalVisible, setInviteModalVisible] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [myUserId, setMyUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMyUserId(data.user.id);
    });
  }, []);

  React.useEffect(() => {
    if (budgetGroup?.name) {
      fetchCollaborators(budgetGroup.name);
    }
  }, [budgetGroup?.name]);

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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteUser(budgetGroup.name, inviteEmail.trim());
      setInviteModalVisible(false);
      setInviteEmail('');
      Alert.alert('Success', 'Invitation sent!');
      fetchCollaborators(budgetGroup.name);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const isOwner = budgetGroup.categories[0]?.userId === myUserId;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Budget Details</Text>
        {isOwner ? (
          <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={24} color={colors.expense} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
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

        {/* Collaborators */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Collaborators</Text>
          {isOwner && (
            <TouchableOpacity onPress={() => setInviteModalVisible(true)}>
              <Text style={{ color: colors.primary, fontFamily: 'Inter-Medium' }}>+ Invite</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.categoriesList}>
          {/* Owner */}
          <View style={[styles.catItem, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }]}>
            <View style={[styles.catIconContainer, { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18 }]}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: colors.text, fontSize: 15 }]}>Owner</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Creator</Text>
            </View>
          </View>

          {/* Collaborators */}
          {collaborators.filter(c => c.budgetName === budgetGroup.name).map((c) => (
            <View key={c.collaboratorId} style={[styles.catItem, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }]}>
              <View style={[styles.catIconContainer, { backgroundColor: c.status === 'pending' ? colors.borderAlt : colors.primary, width: 36, height: 36, borderRadius: 18 }]}>
                <Ionicons name={c.status === 'pending' ? 'time' : 'person'} size={18} color="#fff" />
              </View>
              <View style={styles.catInfo}>
                <Text style={[styles.catName, { color: colors.text, fontSize: 15 }]}>{c.collaboratorName}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{c.status === 'pending' ? 'Pending Invite' : 'Collaborator'}</Text>
              </View>
              {(isOwner || c.collaboratorId === myUserId) && (
                <TouchableOpacity onPress={() => removeCollaborator(budgetGroup.name, budgetGroup.categories[0].userId, c.collaboratorId)}>
                  <Ionicons name="close-circle" size={22} color={colors.expense} />
                </TouchableOpacity>
              )}
            </View>
          ))}
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

      {/* Invite Modal */}
      <Modal visible={inviteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Invite Collaborator</Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>Enter the email address of the Nekofi user you want to invite.</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderAlt }]}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setInviteModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleInvite}>
                <Text style={[styles.modalBtnText, { color: colors.primary }]}>Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 24, borderWidth: 1 },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, marginBottom: 8 },
  modalDesc: { fontFamily: 'Inter-Regular', fontSize: 14, marginBottom: 20 },
  modalInput: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontFamily: 'Inter-Regular', fontSize: 15, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  modalBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
});
