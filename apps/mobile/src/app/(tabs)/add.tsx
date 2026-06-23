import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { Colors } from '@/constants/Colors';
import { TransactionType } from '@/types/transaction';

/**
 * Add transaction screen — floating action tab center button.
 */
export default function AddTransactionScreen() {
  const [type, setType] = useState<TransactionType>('expense');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.typePicker}>
        {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <TransactionForm type={type} onSuccess={() => router.replace('/(tabs)')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  cancel: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.primary },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.text },
  typePicker: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 14, padding: 4, marginBottom: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary },
  typeBtnText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.textMuted },
  typeBtnTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
});
