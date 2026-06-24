import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TransactionType } from '@/types/transaction';

/**
 * Add transaction screen — floating action tab center button.
 */
export default function AddTransactionScreen() {
  const [type, setType] = useState<TransactionType>('expense');
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Add Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={[styles.typePicker, { backgroundColor: colors.surface }]}>
        {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && { backgroundColor: colors.primary }]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeBtnText, { color: colors.textMuted }, type === t && styles.typeBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TransactionForm type={type} onSuccess={() => router.replace('/(tabs)')} />
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  cancel: { fontFamily: 'Inter-Medium', fontSize: 16 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 18 },
  typePicker: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 16, padding: 6, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  typeBtnText: { fontFamily: 'Inter-Medium', fontSize: 14 },
  typeBtnTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
});
