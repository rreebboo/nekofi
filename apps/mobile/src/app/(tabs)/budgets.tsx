import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { BudgetCard } from '@/components/cards/BudgetCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { BudgetPreview } from '@/types/budget';

/**
 * Budgets overview screen.
 */
export default function BudgetsScreen() {
  const { budgets, fetchBudgets, invites, fetchInvites, acceptInvite, declineInvite, previewBudgetByCode, joinBudgetByCode } = useBudgetStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const budgetGroups = React.useMemo(() => computeBudgetGroups(budgets, transactions), [budgets, transactions]);
  const colors = useThemeColors();

  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [previewInfo, setPreviewInfo] = useState<BudgetPreview | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => { 
    fetchBudgets(); 
    fetchTransactions();
    fetchInvites();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Budgets</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]} onPress={() => setJoinModalVisible(true)}>
            <Ionicons name="enter-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]} onPress={() => router.push('/budget/create')}>
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
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
        ListFooterComponent={<View style={{ height: 100 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No budgets yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Create a budget to start tracking your spending goals.</Text>
            <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/budget/create')}>
              <Text style={styles.createBtnText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={joinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.joinModal, { backgroundColor: colors.surface }]}>
            {!previewInfo ? (
              <>
                <Text style={[styles.joinModalTitle, { color: colors.text }]}>Join a Budget</Text>
                <Text style={[styles.joinModalSub, { color: colors.textMuted }]}>Enter the 6-character invite code.</Text>
                <TextInput
                  style={[styles.codeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderAlt }]}
                  placeholder="e.g. A1B2C3"
                  placeholderTextColor={colors.textMuted}
                  value={inviteCode}
                  onChangeText={(text) => setInviteCode(text.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.background }]} onPress={() => { setJoinModalVisible(false); setInviteCode(''); }}>
                    <Text style={[styles.modalActionText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, { backgroundColor: colors.primary }, isJoining && { opacity: 0.7 }]} 
                    disabled={isJoining || inviteCode.length < 6}
                    onPress={async () => {
                      setIsJoining(true);
                      try {
                        const info = await previewBudgetByCode(inviteCode);
                        if (info) {
                          setPreviewInfo(info);
                        } else {
                          Alert.alert('Not Found', 'Invalid or expired invite code.');
                        }
                      } catch (err: any) {
                        Alert.alert('Error', err.message);
                      } finally {
                        setIsJoining(false);
                      }
                    }}
                  >
                    {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalActionText, { color: '#fff' }]}>Next</Text>}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.previewIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="people" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.joinModalTitle, { color: colors.text }]}>Join Budget?</Text>
                <Text style={[styles.joinModalSub, { color: colors.textMuted }]}>
                  You are invited to join <Text style={{ fontFamily: 'Inter-Bold', color: colors.text }}>{previewInfo.budgetName}</Text> owned by <Text style={{ fontFamily: 'Inter-Bold', color: colors.text }}>{previewInfo.ownerName}</Text>.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.background }]} onPress={() => setPreviewInfo(null)}>
                    <Text style={[styles.modalActionText, { color: colors.text }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, { backgroundColor: colors.primary }, isJoining && { opacity: 0.7 }]} 
                    disabled={isJoining}
                    onPress={async () => {
                      setIsJoining(true);
                      try {
                        await joinBudgetByCode(inviteCode);
                        setJoinModalVisible(false);
                        setInviteCode('');
                        setPreviewInfo(null);
                      } catch (err: any) {
                        Alert.alert('Error', err.message);
                      } finally {
                        setIsJoining(false);
                      }
                    }}
                  >
                    {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalActionText, { color: '#fff' }]}>Join</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  joinModal: { width: '100%', borderRadius: 28, padding: 24, alignItems: 'center' },
  joinModalTitle: { fontFamily: 'Inter-Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 },
  joinModalSub: { fontFamily: 'Inter-Regular', fontSize: 15, textAlign: 'center', marginBottom: 24, paddingHorizontal: 12 },
  codeInput: { width: '100%', borderWidth: 1, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, fontFamily: 'Inter-Bold', fontSize: 24, textAlign: 'center', letterSpacing: 4, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalActionBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontFamily: 'Inter-SemiBold', fontSize: 16 },
  previewIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
