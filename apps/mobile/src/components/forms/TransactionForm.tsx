import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTransactionStore } from '@/stores/transactionStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TransactionType, CreateTransactionDto } from '@/types/transaction';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Props {
  type: TransactionType;
  onSuccess: () => void;
}

/**
 * Form for creating a new transaction.
 */
export function TransactionForm({ type, onSuccess }: Props) {
  const { createTransaction } = useTransactionStore();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async () => {
    if (!amount || !description || !category) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const dto: CreateTransactionDto = { type, amount: parsed, currency: 'PHP', category, description, date };
      await createTransaction(dto);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted, textAlign: 'center', marginTop: moderateScale(16) }]}>Amount</Text>
      <View style={styles.amountContainer}>
        <Text style={[styles.currencySymbol, { color: type === 'expense' ? colors.expense : colors.income }]}>
          {type === 'expense' ? '-₱' : '+₱'}
        </Text>
        <TextInput 
          style={[styles.amountInput, { color: type === 'expense' ? colors.expense : colors.income }]} 
          placeholder="0" 
          placeholderTextColor={colors.textMuted} 
          value={amount} 
          onChangeText={setAmount} 
          keyboardType="decimal-pad" 
        />
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} placeholder="What was this for?" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} />

      <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map((c) => (
          <TouchableOpacity 
            key={c.id} 
            style={[styles.categoryBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }, category === c.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]} 
            onPress={() => setCategory(c.id)}
          >
            <Text style={styles.categoryEmoji}>{c.emoji}</Text>
            <Text style={[styles.categoryLabel, { color: colors.textMuted }, category === c.id && { color: colors.primary }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Date</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

      <TouchableOpacity style={[styles.submitBtnContainer, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitBtn}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: moderateScale(8), paddingTop: moderateScale(8) },
  label: { fontFamily: 'Inter-Medium', fontSize: moderateScale(13), marginTop: moderateScale(8) },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: moderateScale(16) },
  currencySymbol: { fontFamily: 'Inter-Bold', fontSize: moderateScale(40), marginRight: moderateScale(8) },
  amountInput: { fontFamily: 'Inter-Bold', fontSize: moderateScale(48), padding: 0, margin: 0, minWidth: scale(60), textAlign: 'center' },
  input: { borderRadius: moderateScale(14), paddingHorizontal: moderateScale(18), paddingVertical: moderateScale(14), fontFamily: 'Inter-Regular', fontSize: moderateScale(15), borderWidth: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8) },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(6), paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(10), borderRadius: moderateScale(16), borderWidth: 1 },
  categoryEmoji: { fontSize: moderateScale(18) },
  categoryLabel: { fontFamily: 'Inter-Medium', fontSize: moderateScale(13) },
  submitBtnContainer: { marginTop: moderateScale(32), borderRadius: moderateScale(16), overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(6) }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  submitBtn: { paddingVertical: moderateScale(18), alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: moderateScale(16), color: '#fff' },
});
