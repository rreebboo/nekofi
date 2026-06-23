import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '@/stores/transactionStore';
import { TransactionItem } from '@/components/cards/TransactionItem';
import { FilterChip } from '@/components/ui/FilterChip';
import { Colors } from '@/constants/Colors';
import { TransactionType } from '@/types/transaction';

const FILTERS: { label: string; value: TransactionType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Transfer', value: 'transfer' },
];

/**
 * Transactions list screen with search and filter.
 */
export default function TransactionsScreen() {
  const { transactions } = useTransactionStore();
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter((t) => {
    const matchType = filter === 'all' || t.type === filter;
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/ai/chat')} style={styles.aiBtn}>
          <Ionicons name="sparkles" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search transactions..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionItem transaction={item} onPress={() => router.push(`/transaction/${item.id}`)} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.text },
  aiBtn: { backgroundColor: Colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text },
  filters: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  empty: { fontFamily: 'Inter-Regular', color: Colors.textMuted, textAlign: 'center', marginTop: 60, fontSize: 15 },
});
