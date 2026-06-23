import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBudgetStore } from '@/stores/budgetStore';
import { BudgetCard } from '@/components/cards/BudgetCard';
import { Colors } from '@/constants/Colors';

/**
 * Budgets overview screen.
 */
export default function BudgetsScreen() {
  const { budgets, fetchBudgets } = useBudgetStore();

  useEffect(() => { fetchBudgets(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Budgets</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/budget/create')}>
          <Ionicons name="add" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BudgetCard budget={item} onPress={() => router.push(`/budget/${item.id}`)} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No budgets yet</Text>
            <Text style={styles.emptySubtitle}>Create a budget to start tracking your spending goals.</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/budget/create')}>
              <Text style={styles.createBtnText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.text },
  addBtn: { backgroundColor: Colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 20, color: Colors.text },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  createBtn: { marginTop: 16, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  createBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
