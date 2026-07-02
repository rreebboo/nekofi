import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreateBudgetGroupDto } from '@/types/budget';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onSuccess: () => void;
}

const PERIODS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
] as const;

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const EMOJIS = ['💰', '🚗', '🏠', '🛒', '✈️', '🍔', '🎁', '🎓'];

const getStartOfPeriod = (p: 'weekly'|'monthly'|'yearly') => {
  const d = new Date();
  if (p === 'weekly') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
  } else if (p === 'monthly') {
    d.setDate(1);
  } else if (p === 'yearly') {
    d.setMonth(0, 1);
  }
  return d.toISOString().split('T')[0];
};

const calculateEndDate = (startStr: string, p: 'weekly'|'monthly'|'yearly', mult: number) => {
  const d = new Date(startStr);
  if (p === 'weekly') {
    d.setDate(d.getDate() + 7 * mult - 1);
  } else if (p === 'monthly') {
    d.setMonth(d.getMonth() + mult);
    d.setDate(d.getDate() - 1);
  } else if (p === 'yearly') {
    d.setFullYear(d.getFullYear() + mult);
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString();
};

export function BudgetForm({ onSuccess }: Props) {
  const { createBudgetGroup } = useBudgetStore();
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [multiplier, setMultiplier] = useState('1');
  const [startDate, setStartDate] = useState(getStartOfPeriod('monthly'));
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  
  const [categories, setCategories] = useState<{categoryId: string, amount: number}[]>([]);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [tempCat, setTempCat] = useState(EXPENSE_CATEGORIES[0].id);
  const [tempAmount, setTempAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const colors = useThemeColors();
  
  const totalAmount = categories.reduce((sum, c) => sum + c.amount, 0);

  useEffect(() => {
    setStartDate(getStartOfPeriod(period));
  }, [period]);

  const handleAddCategory = () => {
    if (!tempAmount) return;
    const parsed = parseFloat(tempAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    
    if (categories.find(c => c.categoryId === tempCat)) {
       setCategories(prev => prev.map(c => c.categoryId === tempCat ? { ...c, amount: parsed } : c));
    } else {
       setCategories(prev => [...prev, { categoryId: tempCat, amount: parsed }]);
    }
    
    setIsAddingCat(false);
    setTempAmount('');
  };

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.categoryId !== id));
  };

  const handleSubmit = async () => {
    if (!name || !startDate) {
      Alert.alert('Missing Fields', 'Please enter a budget name and start date.');
      return;
    }
    const multNum = parseInt(multiplier, 10);
    if (isNaN(multNum) || multNum < 1) {
      Alert.alert('Invalid Multiplier', 'Period multiplier must be at least 1.');
      return;
    }
    if (categories.length === 0) {
      Alert.alert('No Categories', 'Please add at least one budget category.');
      return;
    }

    setLoading(true);
    try {
      const dto: CreateBudgetGroupDto = { 
        name, 
        currency: 'PHP', 
        period,
        startDate: new Date(startDate).toISOString(),
        endDate: calculateEndDate(startDate, period, multNum),
        color,
        emoji,
        categories
      };
      await createBudgetGroup(dto);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
        <Text style={[styles.amountValue, { color: colors.text }]}>
          {totalAmount > 0 ? `₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}
        </Text>
        <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total Budget</Text>
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Budget Name</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]} 
        placeholder="e.g. Summer Vacation" 
        placeholderTextColor={colors.textMuted} 
        value={name} 
        onChangeText={setName} 
      />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]} onPress={() => setColor(c)} />
            ))}
          </ScrollView>
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
            {EMOJIS.map(e => (
              <TouchableOpacity key={e} style={[styles.emojiBtn, emoji === e && { backgroundColor: colors.borderAlt }]} onPress={() => setEmoji(e)}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

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

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Period Multiplier</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text, textAlign: 'center' }]} 
            value={multiplier} 
            onChangeText={setMultiplier} 
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Start Date</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text, textAlign: 'center' }]} 
            placeholder="YYYY-MM-DD" 
            placeholderTextColor={colors.textMuted} 
            value={startDate} 
            onChangeText={setStartDate} 
          />
        </View>
      </View>

      <View style={styles.sectionDivider} />
      
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Set Budget Categories</Text>
        <TouchableOpacity onPress={() => setIsAddingCat(true)}>
          <Text style={{ color: colors.primary, fontFamily: 'Inter-Medium' }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {categories.map((c) => {
        const catInfo = EXPENSE_CATEGORIES.find(e => e.id === c.categoryId);
        return (
          <View key={c.categoryId} style={[styles.catItem, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
            <Text style={styles.catEmoji}>{catInfo?.emoji}</Text>
            <Text style={[styles.catName, { color: colors.text }]}>{catInfo?.label}</Text>
            <Text style={[styles.catAmount, { color: colors.text }]}>₱{c.amount}</Text>
            <TouchableOpacity onPress={() => removeCategory(c.categoryId)}>
              <Ionicons name="trash-outline" size={20} color={colors.expense} />
            </TouchableOpacity>
          </View>
        );
      })}

      {categories.length === 0 && !isAddingCat && (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No categories added yet.</Text>
      )}

      {isAddingCat && (
        <View style={[styles.addCatBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 0 }]}>Select Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catSelectScroll}>
            {EXPENSE_CATEGORIES.map(c => (
              <TouchableOpacity 
                key={c.id} 
                style={[styles.catSelectBtn, { borderColor: colors.borderAlt }, tempCat === c.id && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]} 
                onPress={() => setTempCat(c.id)}
              >
                <Text style={styles.catSelectEmoji}>{c.emoji}</Text>
                <Text style={[styles.catSelectLabel, { color: colors.text }]} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textMuted }]}>Amount Limit</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.borderAlt, color: colors.text }]} 
            placeholder="0.00" 
            placeholderTextColor={colors.textMuted} 
            value={tempAmount} 
            onChangeText={setTempAmount} 
            keyboardType="decimal-pad" 
          />

          <View style={styles.addCatActions}>
            <TouchableOpacity style={[styles.addCatActionBtn, { borderColor: colors.borderAlt, borderWidth: 1 }]} onPress={() => setIsAddingCat(false)}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addCatActionBtn, { backgroundColor: colors.primary }]} onPress={handleAddCategory}>
              <Text style={{ color: '#fff', fontFamily: 'Inter-Medium' }}>Save Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  label: { fontFamily: 'Inter-Medium', fontSize: 13, marginTop: 12, marginBottom: 4 },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontFamily: 'Inter-Regular', fontSize: 15, borderWidth: 1 },
  amountCard: { borderRadius: 24, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 8 },
  amountValue: { fontFamily: 'Inter-Bold', fontSize: 40, marginBottom: 4 },
  amountLabel: { fontFamily: 'Inter-Medium', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  colorRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  emojiBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 20 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  periodLabel: { fontFamily: 'Inter-Medium', fontSize: 14 },
  sectionDivider: { height: 1, backgroundColor: '#333', marginVertical: 16, opacity: 0.1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16 },
  catItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  catEmoji: { fontSize: 20, marginRight: 12 },
  catName: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15 },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: 15, marginRight: 12 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center', marginVertical: 12 },
  addCatBox: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  catSelectScroll: { marginBottom: 12 },
  catSelectBtn: { alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, marginRight: 8, width: 72 },
  catSelectEmoji: { fontSize: 24, marginBottom: 4 },
  catSelectLabel: { fontFamily: 'Inter-Medium', fontSize: 10, textAlign: 'center' },
  addCatActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  addCatActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
