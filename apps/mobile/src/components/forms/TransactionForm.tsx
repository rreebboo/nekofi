import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTransactionStore } from '@/stores/transactionStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { Colors } from '@/constants/Colors';
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

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
      <Text style={styles.label}>Amount (PHP)</Text>
      <TextInput style={styles.amountInput} placeholder="0.00" placeholderTextColor={Colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.input} placeholder="What was this for?" placeholderTextColor={Colors.textMuted} value={description} onChangeText={setDescription} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map((c) => (
          <TouchableOpacity key={c.id} style={[styles.categoryBtn, category === c.id && styles.categoryBtnActive]} onPress={() => setCategory(c.id)}>
            <Text style={styles.categoryEmoji}>{c.emoji}</Text>
            <Text style={[styles.categoryLabel, category === c.id && styles.categoryLabelActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Date</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} />

      <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingTop: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textMuted, marginTop: 8 },
  amountInput: { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 18, fontFamily: 'Inter-Bold', fontSize: 32, color: Colors.text, borderWidth: 1, borderColor: Colors.border, textAlign: 'center' },
  input: { backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  categoryBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted },
  categoryLabelActive: { color: Colors.primary },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
