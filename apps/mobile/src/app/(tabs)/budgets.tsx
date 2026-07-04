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
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useFabScroll } from '@/contexts/FabContext';

/**
 * Budgets overview screen.
 */
export default function BudgetsScreen() {
  const { budgets, fetchBudgets, invites, fetchInvites, acceptInvite, declineInvite } = useBudgetStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const budgetGroups = React.useMemo(() => computeBudgetGroups(budgets, transactions), [budgets, transactions]);
  const colors = useThemeColors();
  const scrollHandler = useFabScroll();

  useEffect(() => { 
    fetchBudgets(); 
    fetchTransactions();
    fetchInvites();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Budgets</Text>
        <AnimatedPressable style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]} onPress={() => router.push('/budget/create')}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </AnimatedPressable>
      </View>

      <Animated.FlatList
        data={budgetGroups}
        keyExtractor={(b) => b.name}
        ListHeaderComponent={invites.length > 0 ? (
          <View style={styles.invitesContainer}>
            {invites.map((invite, index) => (
              <View key={`${invite.budgetName}-${invite.ownerId}`} style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
                <View style={styles.inviteInfo}>
                  <Text style={[styles.inviteText, { color: colors.text }]}>
                    <Text style={{ fontFamily: 'Inter-SemiBold' }}>{invite.ownerName}</Text> invited you to <Text style={{ fontFamily: 'Inter-SemiBold' }}>{invite.budgetName}</Text>
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity 
                    style={[styles.inviteBtn, { backgroundColor: colors.primary + '20' }]} 
                    onPress={() => acceptInvite(invite.budgetName, invite.ownerId)}
                  >
                    <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.inviteBtn, { backgroundColor: '#FF4B4B20' }]} 
                    onPress={() => declineInvite(invite.budgetName, invite.ownerId)}
                  >
                    <Text style={[styles.inviteBtnText, { color: '#FF4B4B' }]}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <BudgetCard budget={item} onPress={() => router.push(`/budget/${encodeURIComponent(item.name)}`)} />
          </Animated.View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListFooterComponent={<View style={{ height: 100 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No budgets yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Create a budget to start tracking your spending goals.</Text>
            <AnimatedPressable style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/budget/create')}>
              <Text style={styles.createBtnText}>Create Budget</Text>
            </AnimatedPressable>
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
  invitesContainer: { paddingHorizontal: 20, marginBottom: 16, gap: 8 },
  inviteCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  inviteInfo: { flexDirection: 'row', alignItems: 'center' },
  inviteText: { fontFamily: 'Inter-Regular', fontSize: 15, flex: 1 },
  inviteActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  inviteBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  inviteBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
});
