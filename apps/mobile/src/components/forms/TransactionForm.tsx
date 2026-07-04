import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

import { LinearGradient } from 'expo-linear-gradient';
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
      <Text style={[styles.label, { color: colors.textMuted, textAlign: 'center', marginTop: 16 }]}>Amount</Text>
      <View style={styles.amountContainer}>
        <Text style={[styles.currencySymbol, { color: colors.text }]}>₱</Text>
        <TextInput 
          style={[styles.amountInput, { color: colors.text }]} 
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
          <AnimatedPressable 
            key={c.id} 
            style={[styles.categoryBtn, { backgroundColor: colors.surface, borderColor: colors.borderAlt }, category === c.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }]} 
            onPress={() => setCategory(c.id)}
          >
            <Text style={styles.categoryEmoji}>{c.emoji}</Text>
            <Text style={[styles.categoryLabel, { color: colors.textMuted }, category === c.id && { color: colors.primary }]}>{c.label}</Text>
          </AnimatedPressable>
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

      <AnimatedPressable style={[styles.submitBtnContainer, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.submitBtn}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingTop: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, marginTop: 8 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  currencySymbol: { fontFamily: 'Inter-Bold', fontSize: 40, marginRight: 8 },
  amountInput: { fontFamily: 'Inter-Bold', fontSize: 48, padding: 0, margin: 0, minWidth: 60, textAlign: 'center' },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  categoryEmoji: { fontSize: 18 },
  categoryLabel: { fontFamily: 'Inter-Medium', fontSize: 13 },
  submitBtnContainer: { marginTop: 32, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  submitBtn: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#fff' },
});
