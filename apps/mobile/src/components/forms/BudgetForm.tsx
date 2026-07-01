import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreateBudgetDto } from '@/types/budget';

interface Props {
  onSuccess: () => void;
}

const PERIODS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
] as const;

export function BudgetForm({ onSuccess }: Props) {
  const { createBudget } = useBudgetStore();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();

  const handleSubmit = async () => {
    if (!name || !amount || !startDate) {
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
      const dto: CreateBudgetDto = { 
        name, 
        amount: parsed, 
        currency: 'PHP', 
        category: 'general', // Default category since it's removed from form
        period,
        startDate: new Date(startDate).toISOString(),
        color: '#4F46E5', // Default primary color
        emoji: '💰'
      };
      await createBudget(dto);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: colors.textMuted }]}>Budget Name</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} 
        placeholder="e.g. Groceries" 
        placeholderTextColor={colors.textMuted} 
        value={name} 
        onChangeText={setName} 
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Amount Limit (PHP)</Text>
      <TextInput 
        style={[styles.amountInput, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} 
        placeholder="0.00" 
        placeholderTextColor={colors.textMuted} 
        value={amount} 
        onChangeText={setAmount} 
        keyboardType="decimal-pad" 
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>Period</Text>
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity 
            key={p.id} 
            style={[
              styles.periodBtn, 
              { backgroundColor: colors.surface, borderColor: colors.borderAlt }, 
              period === p.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
            ]} 
            onPress={() => setPeriod(p.id)}
          >
            <Text style={[styles.periodLabel, { color: colors.textMuted }, period === p.id && { color: colors.primary }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Start Date</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} 
        placeholder="YYYY-MM-DD" 
        placeholderTextColor={colors.textMuted} 
        value={startDate} 
        onChangeText={setStartDate} 
      />

      <TouchableOpacity 
        style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.submitBtnDisabled]} 
        onPress={handleSubmit} 
        disabled={loading}
      >
        <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Create Budget'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingBottom: 40, paddingTop: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, marginTop: 12 },
  amountInput: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, fontFamily: 'Inter-Bold', fontSize: 32, borderWidth: 1, textAlign: 'center' },
  input: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  periodLabel: { fontFamily: 'Inter-Medium', fontSize: 14 },
  submitBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
