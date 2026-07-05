import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TransactionType } from '@/types/transaction';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

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
        <View style={{ width: scale(60) }} />
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
        <View style={{ height: verticalScale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: moderateScale(20), paddingVertical: moderateScale(16) },
  cancel: { fontFamily: 'Inter-Medium', fontSize: moderateScale(16) },
  title: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(18) },
  typePicker: { flexDirection: 'row', marginHorizontal: moderateScale(20), borderRadius: moderateScale(16), padding: moderateScale(6), marginBottom: moderateScale(12) },
  typeBtn: { flex: 1, paddingVertical: moderateScale(12), borderRadius: moderateScale(12), alignItems: 'center' },
  typeBtnText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14) },
  typeBtnTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(40) },
});
