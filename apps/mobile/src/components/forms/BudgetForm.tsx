import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreateBudgetGroupDto } from '@/types/budget';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

interface Props {
  onSuccess: () => void;
}

const PERIODS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
] as const;

// We place green first so it's the default!
const COLORS = ['#10B981', '#4F46E5', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];
const EMOJIS = ['💰', '🚗', '🏠', '🛒', '✈️', '🍔', '🎁', '🎓', '🏥', '🎮', '👗', '🐾'];

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
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (categories.find(c => c.categoryId === tempCat)) {
       setCategories(prev => prev.map(c => c.categoryId === tempCat ? { ...c, amount: parsed } : c));
    } else {
       setCategories(prev => [...prev, { categoryId: tempCat, amount: parsed }]);
    }
    
    setIsAddingCat(false);
    setTempAmount('');
  };

  const removeCategory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategories(prev => prev.filter(c => c.categoryId !== id));
  };

  const handleSubmit = async () => {
    if (!name || !startDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Fields', 'Please enter a budget name and start date.');
      return;
    }
    const multNum = parseInt(multiplier, 10);
    if (isNaN(multNum) || multNum < 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Invalid Multiplier', 'Period multiplier must be at least 1.');
      return;
    }
    if (categories.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No Categories', 'Please add at least one budget category.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      
      {/* Hero Card */}
      <View style={styles.heroCardShadow}>
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroAmount}>
            {totalAmount > 0 ? `₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}
          </Text>
          <View style={styles.heroLabelContainer}>
            <Text style={styles.heroLabel}>TOTAL BUDGET</Text>
          </View>
        </LinearGradient>
      </View>

      {/* Basic Info Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Budget Name</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]} 
            placeholder="e.g. Summer Vacation" 
            placeholderTextColor={colors.textMuted} 
            value={name} 
            onChangeText={setName} 
          />
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {COLORS.map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]} 
                  onPress={() => {
                    Haptics.selectionAsync();
                    setColor(c);
                  }} 
                />
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity 
                  key={e} 
                  style={[styles.emojiBtn, { backgroundColor: colors.background }, emoji === e && { backgroundColor: color + '30', borderColor: color, borderWidth: 1 }]} 
                  onPress={() => {
                    Haptics.selectionAsync();
                    setEmoji(e);
                  }}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Timeframe Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Recurrence</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.background }]}>
            {PERIODS.map((p) => (
              <TouchableOpacity 
                key={p.id} 
                style={[
                  styles.segmentBtn, 
                  period === p.id && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }
                ]} 
                onPress={() => {
                  Haptics.selectionAsync();
                  setPeriod(p.id);
                }}
              >
                <Text style={[
                  styles.segmentLabel, 
                  { color: colors.textMuted }, 
                  period === p.id && { color: '#fff', fontFamily: 'Inter-SemiBold' }
                ]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={styles.flex1}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Multiplier</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, textAlign: 'center' }]} 
              value={multiplier} 
              onChangeText={setMultiplier} 
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Start Date</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, textAlign: 'center' }]} 
              placeholder="YYYY-MM-DD" 
              placeholderTextColor={colors.textMuted} 
              value={startDate} 
              onChangeText={setStartDate} 
            />
          </View>
        </View>
      </View>

      {/* Allocations Card */}
      <View style={styles.allocationsHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Allocations</Text>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary + '20' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsAddingCat(true);
          }}
        >
          <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 2 }} />
          <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Category</Text>
        </TouchableOpacity>
      </View>

      {categories.map((c, index) => {
        const catInfo = EXPENSE_CATEGORIES.find(e => e.id === c.categoryId);
        return (
          <Animated.View 
            key={c.categoryId} 
            entering={FadeInDown.delay(index * 50).springify()}
            layout={Layout.springify()}
            style={[styles.catItem, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.catIconContainer, { backgroundColor: colors.background }]}>
              <Text style={styles.catEmoji}>{catInfo?.emoji}</Text>
            </View>
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: colors.text }]}>{catInfo?.label}</Text>
              <Text style={[styles.catAmount, { color: colors.primary }]}>₱{c.amount.toLocaleString()}</Text>
            </View>
            <TouchableOpacity onPress={() => removeCategory(c.categoryId)} style={styles.removeBtn}>
              <Ionicons name="close-circle" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {categories.length === 0 && !isAddingCat && (
        <Animated.View entering={FadeInDown} style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Ionicons name="pie-chart-outline" size={32} color={colors.textMuted} style={{ opacity: 0.5, marginBottom: 8 }} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Start building your budget by adding categories.</Text>
        </Animated.View>
      )}

      {isAddingCat && (
        <Animated.View 
          entering={FadeInDown.springify()} 
          layout={Layout.springify()}
          style={[styles.addCatBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        >
          <Text style={[styles.label, { color: colors.textMuted, marginTop: 0 }]}>Select Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catSelectScroll}>
            {EXPENSE_CATEGORIES.map(c => (
              <TouchableOpacity 
                key={c.id} 
                style={[
                  styles.catSelectBtn, 
                  { backgroundColor: colors.background }, 
                  tempCat === c.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1 }
                ]} 
                onPress={() => {
                  Haptics.selectionAsync();
                  setTempCat(c.id);
                }}
              >
                <Text style={styles.catSelectEmoji}>{c.emoji}</Text>
                <Text style={[styles.catSelectLabel, { color: colors.text }]} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textMuted }]}>Amount Limit</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, fontSize: 18, fontFamily: 'Inter-SemiBold' }]} 
            placeholder="0.00" 
            placeholderTextColor={colors.textMuted} 
            value={tempAmount} 
            onChangeText={setTempAmount} 
            keyboardType="decimal-pad" 
          />

          <View style={styles.addCatActions}>
            <TouchableOpacity 
              style={[styles.addCatActionBtn, { backgroundColor: colors.background }]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddingCat(false);
              }}
            >
              <Text style={{ color: colors.text, fontFamily: 'Inter-Medium' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addCatActionBtn, { backgroundColor: colors.primary }]} onPress={handleAddCategory}>
              <Text style={{ color: '#fff', fontFamily: 'Inter-Medium' }}>Save Category</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <Animated.View layout={Layout.springify()} style={{ marginTop: 24, marginBottom: 12 }}>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, loading && styles.submitBtnDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Create Budget'}</Text>
          {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
        </TouchableOpacity>
      </Animated.View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 50, paddingTop: 8, paddingHorizontal: 4 },
  card: { padding: 20, borderRadius: 24, gap: 16 },
  
  heroCardShadow: { marginHorizontal: 4, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, borderRadius: 28, backgroundColor: '#7DA82F', marginBottom: 24 },
  heroCard: { paddingVertical: 40, paddingHorizontal: 20, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  heroAmount: { fontFamily: 'Inter-Bold', fontSize: 44, color: '#fff', marginBottom: 2 },
  heroLabelContainer: { alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },

  inputGroup: { gap: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 16 },
  
  row: { flexDirection: 'row', gap: 16 },
  flex1: { flex: 1 },
  
  pickerRow: { flexDirection: 'row', gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
  colorDot: { width: 36, height: 36, borderRadius: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  emojiBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
  
  segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 16 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontFamily: 'Inter-Medium', fontSize: 14 },
  
  allocationsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, paddingHorizontal: 8 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 20 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },

  catItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 8 },
  catIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  catEmoji: { fontSize: 24 },
  catInfo: { flex: 1, gap: 4 },
  catName: { fontFamily: 'Inter-Medium', fontSize: 16 },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: 15 },
  removeBtn: { padding: 4 },
  
  emptyState: { padding: 32, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, textAlign: 'center' },
  
  addCatBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginTop: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  catSelectScroll: { marginVertical: 12 },
  catSelectBtn: { alignItems: 'center', padding: 12, borderRadius: 16, marginRight: 12, width: 80 },
  catSelectEmoji: { fontSize: 28, marginBottom: 8 },
  catSelectLabel: { fontFamily: 'Inter-Medium', fontSize: 11, textAlign: 'center' },
  addCatActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  addCatActionBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  
  submitBtn: { flexDirection: 'row', borderRadius: 20, paddingVertical: 20, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: 18, color: '#fff' },
});
