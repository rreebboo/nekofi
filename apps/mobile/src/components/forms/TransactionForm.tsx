import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTransactionStore } from '@/stores/transactionStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { TransactionType, CreateTransactionDto } from '@/types/transaction';

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
  const [customCategory, setCustomCategory] = useState('');
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
      const finalCategory = category.startsWith('other') ? (customCategory.trim() || 'Others') : category;
      const dto: CreateTransactionDto = { type, amount: parsed, currency: 'PHP', category: finalCategory, description, date };
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
      <Text style={[styles.label, { color: colors.textMuted }]}>Amount (PHP)</Text>
      <TextInput style={[styles.amountInput, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} placeholder="0.00" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

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
      {category.startsWith('other') && (
        <TextInput 
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text, marginTop: 4 }]} 
          placeholder="Specify custom category (optional)" 
          placeholderTextColor={colors.textMuted} 
          value={customCategory} 
          onChangeText={setCustomCategory} 
        />
      )}

      <Text style={[styles.label, { color: colors.textMuted }]}>Date</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} />

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingTop: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, marginTop: 8 },
  amountInput: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, fontFamily: 'Inter-Bold', fontSize: 32, borderWidth: 1, textAlign: 'center' },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontFamily: 'Inter-Regular', fontSize: 12 },
  submitBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
