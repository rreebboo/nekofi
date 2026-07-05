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
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

export default function BudgetDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colors = useThemeColors();

  const name = decodeURIComponent(id as string);
  const { budgets, deleteBudgetGroup, collaborators, fetchCollaborators, inviteUser, removeCollaborator, regenerateInviteCode } = useBudgetStore();
  const transactions = useTransactionStore((state) => state.transactions);
  const budgetGroup = useMemo(() => computeBudgetGroups(budgets, transactions).find(bg => bg.name === name), [budgets, transactions, name]);

  const [inviteModalVisible, setInviteModalVisible] = React.useState(false);
  const [codeModalVisible, setCodeModalVisible] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
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
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: moderateScale(16) }}>
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
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
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

        {/* Collaborators */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Collaborators</Text>
          {isOwner && (
            <View style={{ flexDirection: 'row', gap: moderateScale(16) }}>
              <TouchableOpacity onPress={() => setCodeModalVisible(true)}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter-Medium' }}>Share Code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setInviteModalVisible(true)}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter-Medium' }}>+ Invite</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.categoriesList}>
          {/* Owner */}
          <View style={[styles.catItem, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(12) }]}>
            <View style={[styles.catIconContainer, { backgroundColor: colors.primary, width: scale(36), height: verticalScale(36), borderRadius: moderateScale(18) }]}>
              <Ionicons name="person" size={18} color="#fff" />
            </View>
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: colors.text, fontSize: moderateScale(15) }]}>Owner</Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateScale(12) }}>Creator</Text>
            </View>
          </View>

          {/* Collaborators */}
          {collaborators.filter(c => c.budgetName === budgetGroup.name).map((c) => (
            <View key={c.collaboratorId} style={[styles.catItem, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(12) }]}>
              <View style={[styles.catIconContainer, { backgroundColor: c.status === 'pending' ? colors.borderAlt : colors.primary, width: scale(36), height: verticalScale(36), borderRadius: moderateScale(18) }]}>
                <Ionicons name={c.status === 'pending' ? 'time' : 'person'} size={18} color="#fff" />
              </View>
              <View style={styles.catInfo}>
                <Text style={[styles.catName, { color: colors.text, fontSize: moderateScale(15) }]}>{c.collaboratorName}</Text>
                <Text style={{ color: colors.textMuted, fontSize: moderateScale(12) }}>{c.status === 'pending' ? 'Pending Invite' : 'Collaborator'}</Text>
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
            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: moderateScale(8) }} />
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

      {/* Code Modal */}
      <Modal visible={codeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Invite Code</Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Share this code with others to let them join your budget.
            </Text>

            <View style={{ paddingVertical: moderateScale(20), borderWidth: 1, borderColor: colors.borderAlt, borderRadius: moderateScale(16), backgroundColor: colors.background, alignItems: 'center', marginBottom: moderateScale(24) }}>
              {isRegenerating ? (
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: moderateScale(32), color: colors.textMuted }}>...</Text>
              ) : (
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: moderateScale(32), letterSpacing: 4, color: colors.text }}>
                  {budgetGroup?.categories[0]?.inviteCode || 'NONE'}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: moderateScale(12), marginBottom: moderateScale(16) }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: moderateScale(14), borderRadius: moderateScale(12), alignItems: 'center', backgroundColor: colors.primary }}
                onPress={async () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  await Clipboard.setStringAsync(budgetGroup?.categories[0]?.inviteCode || '');
                  Alert.alert('Copied!', 'Invite code copied to clipboard.');
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter-Medium' }}>Copy Code</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ alignItems: 'center', paddingVertical: moderateScale(8) }} onPress={() => setCodeModalVisible(false)}>
              <Text style={{ color: colors.textMuted, fontFamily: 'Inter-Medium' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Options Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContent, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                setCodeModalVisible(true);
              }}
            >
              <Ionicons name="qr-code-outline" size={20} color={colors.text} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Share Code</Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.borderAlt }]} />

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                setInviteModalVisible(true);
              }}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.text} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Invite Collaborators</Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.borderAlt }]} />
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Coming Soon', 'Edit budget functionality will be available soon.');
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.text} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Budget</Text>
            </TouchableOpacity>
            
            <View style={[styles.menuDivider, { backgroundColor: colors.borderAlt }]} />
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                handleDelete();
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.expense} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: colors.expense }]}>Delete Budget</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(60),
    paddingBottom: moderateScale(16),
  },
  headerBtn: { padding: moderateScale(4), width: scale(40), alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter-Bold', fontSize: moderateScale(18) },
  content: { padding: moderateScale(16), paddingBottom: moderateScale(60) },

  heroCard: {
    padding: moderateScale(20),
    borderRadius: moderateScale(24),
    marginBottom: moderateScale(24),
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitleContainer: { flex: 1 },
  heroBudgetName: { fontFamily: 'Inter-Bold', fontSize: moderateScale(22), marginBottom: moderateScale(2) },
  heroBudgetPeriod: { fontFamily: 'Inter-Medium', fontSize: moderateScale(12), textTransform: 'capitalize' },
  heroDivider: { height: 1, marginVertical: moderateScale(16) },
  heroAmountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: moderateScale(16) },
  heroAmountCol: { flex: 1 },
  heroAmountLabel: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(11), marginBottom: moderateScale(4), letterSpacing: 0.5 },
  heroAmountValue: { fontFamily: 'Inter-Bold', fontSize: moderateScale(20) },

  progressContainer: { marginTop: moderateScale(4) },
  progressBarBg: { height: verticalScale(8), borderRadius: moderateScale(4), overflow: 'hidden', marginBottom: moderateScale(8) },
  progressBarFill: { height: '100%', borderRadius: moderateScale(4) },
  progressText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', textAlign: 'right' },

  sectionHeader: { marginBottom: moderateScale(16), marginTop: moderateScale(8), paddingHorizontal: moderateScale(4) },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: moderateScale(20) },

  categoriesList: { marginBottom: moderateScale(24), gap: moderateScale(12) },
  catItem: { padding: moderateScale(16), borderRadius: moderateScale(24), elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.05, shadowRadius: 4 },
  catItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(16) },
  catIconContainer: { width: scale(44), height: verticalScale(44), borderRadius: moderateScale(22), alignItems: 'center', justifyContent: 'center', marginRight: moderateScale(12) },
  catEmoji: { fontSize: moderateScale(22) },
  catInfo: { flex: 1 },
  catName: { fontFamily: 'Inter-Medium', fontSize: moderateScale(16), marginBottom: moderateScale(2) },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: moderateScale(14) },
  catProgressBarBg: { height: verticalScale(8), borderRadius: moderateScale(4), overflow: 'hidden' },
  catProgressBarFill: { height: '100%', borderRadius: moderateScale(4) },

  transactionsContainer: { gap: moderateScale(8), marginTop: moderateScale(4) },
  emptyState: { padding: moderateScale(32), borderRadius: moderateScale(24), alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: moderateScale(20) },
  modalContent: { width: '100%', padding: moderateScale(24), borderRadius: moderateScale(24), borderWidth: 1 },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: moderateScale(18), marginBottom: moderateScale(8) },
  modalDesc: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), marginBottom: moderateScale(20) },
  modalInput: { height: verticalScale(48), borderWidth: 1, borderRadius: moderateScale(12), paddingHorizontal: moderateScale(16), fontFamily: 'Inter-Regular', fontSize: moderateScale(15), marginBottom: moderateScale(24) },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: moderateScale(16) },
  modalBtn: { paddingVertical: moderateScale(8), paddingHorizontal: moderateScale(16) },
  modalBtnText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15) },
  
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: moderateScale(90), paddingRight: moderateScale(20) },
  menuContent: { width: scale(220), borderRadius: moderateScale(16), borderWidth: 1, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.1, shadowRadius: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(16), paddingHorizontal: moderateScale(16) },
  menuItemIcon: { marginRight: moderateScale(12) },
  menuItemText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(15) },
  menuDivider: { height: 1 },
});
