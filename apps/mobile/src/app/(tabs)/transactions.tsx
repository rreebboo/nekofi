import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionStore } from '@/stores/transactionStore';
import { TransactionItem } from '@/components/cards/TransactionItem';
import { FilterChip } from '@/components/ui/FilterChip';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TransactionType } from '@/types/transaction';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

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
  const colors = useThemeColors();

  const filtered = transactions.filter((t) => {
    const matchType = filter === 'all' || t.type === filter;
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <TouchableOpacity onPress={() => router.push('/ai/chat')} style={[styles.aiBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: moderateScale(8) }} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search transactions..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TransactionItem transaction={item} onPress={() => router.push(`/transaction/${item.id}`)} />
          </Animated.View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No transactions found.</Text>}
        ListFooterComponent={<View style={{ height: verticalScale(100) }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: moderateScale(20), paddingTop: moderateScale(16), paddingBottom: moderateScale(12) },
  title: { fontFamily: 'Inter-Bold', fontSize: moderateScale(28) },
  aiBtn: { borderRadius: moderateScale(16), padding: moderateScale(10), borderWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(16), marginHorizontal: moderateScale(20), paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(14), marginBottom: moderateScale(16), borderWidth: 1 },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: moderateScale(15) },
  filters: { flexDirection: 'row', paddingHorizontal: moderateScale(20), gap: moderateScale(8), marginBottom: moderateScale(12) },
  list: { paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(32) },
  empty: { fontFamily: 'Inter-Regular', textAlign: 'center', marginTop: moderateScale(60), fontSize: moderateScale(15) },
});
