import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, Pressable } from 'react-native';
import { useBudgetStore } from '@/stores/budgetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreateBudgetGroupDto } from '@/types/budget';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

interface Props {
  onSuccess: () => void;
}

const PERIODS = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
] as const;

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

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export function BudgetForm({ onSuccess }: Props) {
  const { createBudgetGroup } = useBudgetStore();
  const colors = useThemeColors();

  // Step state
  const [step, setStep] = useState(1);
  
  // Data state
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [multiplier, setMultiplier] = useState('1');
  const [startDate, setStartDate] = useState(getStartOfPeriod('monthly'));
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [categories, setCategories] = useState<{categoryId: string, amount: number}[]>([]);

  // Category Modal state
  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState('');

  // Calendar Modal state
  const [isCalVisible, setIsCalVisible] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStartDate(getStartOfPeriod(period));
  }, [period]);

  const totalAmount = categories.reduce((sum, c) => sum + c.amount, 0);

  const openCatModal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCatId(id);
    const existing = categories.find(c => c.categoryId === id);
    setTempAmount(existing && existing.amount > 0 ? existing.amount.toString() : '');
    setIsCatModalVisible(true);
  };

  const saveCategory = () => {
    if (!activeCatId) return;
    const parsed = parseFloat(tempAmount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (isNaN(parsed) || parsed <= 0) {
      // Remove it
      setCategories(prev => prev.filter(c => c.categoryId !== activeCatId));
    } else {
      if (categories.find(c => c.categoryId === activeCatId)) {
        setCategories(prev => prev.map(c => c.categoryId === activeCatId ? { ...c, amount: parsed } : c));
      } else {
        setCategories(prev => [...prev, { categoryId: activeCatId, amount: parsed }]);
      }
    }
    setIsCatModalVisible(false);
  };

  const openCalendar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(startDate);
    if (!isNaN(d.getTime())) {
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    }
    setIsCalVisible(true);
  };

  const selectDate = (day: number) => {
    Haptics.selectionAsync();
    const m = (calMonth + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    setStartDate(`${calYear}-${m}-${d}`);
    setIsCalVisible(false);
  };

  const nextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step === 1 && !name.trim()) {
      Alert.alert('Required', 'Please enter a budget name.');
      return;
    }
    if (step === 2 && categories.length === 0) {
      Alert.alert('Required', 'Please set an amount for at least one category.');
      return;
    }
    setStep(s => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    try {
      const multNum = parseInt(multiplier, 10) || 1;
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

  const renderCalendarModal = () => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <Modal visible={isCalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.calModal, { backgroundColor: colors.surface }]}>
            <View style={styles.calHeader}>
              <TouchableOpacity onPress={() => {
                if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                else setCalMonth(m => m - 1);
              }}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.calMonthText, { color: colors.text }]}>{monthNames[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={() => {
                if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                else setCalMonth(m => m + 1);
              }}>
                <Ionicons name="chevron-forward" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.calWeekRow}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={[styles.calWeekDay, { color: colors.textMuted }]}>{d}</Text>
              ))}
            </View>
            <View style={styles.calDaysGrid}>
              {blanks.map(b => <View key={`blank-${b}`} style={styles.calDayCell} />)}
              {days.map(d => {
                const isSelected = startDate === `${calYear}-${(calMonth+1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                return (
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.calDayCell, isSelected && { backgroundColor: colors.primary, borderRadius: 20 }]} 
                    onPress={() => selectDate(d)}
                  >
                    <Text style={[styles.calDayText, { color: isSelected ? '#fff' : colors.text }]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={[styles.calCloseBtn, { backgroundColor: colors.background }]} onPress={() => setIsCalVisible(false)}>
              <Text style={[styles.calCloseBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCategoryModal = () => {
    const catInfo = EXPENSE_CATEGORIES.find(c => c.id === activeCatId);
    return (
      <Modal visible={isCatModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.catModal, { backgroundColor: colors.surface }]}>
            <View style={styles.catModalHeader}>
              <View style={[styles.catModalIcon, { backgroundColor: colors.background }]}>
                <Text style={{ fontSize: 32 }}>{catInfo?.emoji}</Text>
              </View>
              <Text style={[styles.catModalTitle, { color: colors.text }]}>{catInfo?.label}</Text>
              <Text style={[styles.catModalSub, { color: colors.textMuted }]}>Set your spending limit</Text>
            </View>
            <TextInput 
              style={[styles.catModalInput, { backgroundColor: colors.background, color: colors.text }]} 
              placeholder="0.00" 
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={tempAmount}
              onChangeText={setTempAmount}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.background }]} onPress={() => setIsCatModalVisible(false)}>
                <Text style={[styles.modalActionText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.primary }]} onPress={saveCategory}>
                <Text style={[styles.modalActionText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderStep1 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Budget Identity</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>What are you saving for?</Text>
      
      <View style={{ gap: 24, marginTop: 32 }}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Name your budget</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]} 
            placeholder="e.g. Summer Vacation, Monthly Expenses" 
            placeholderTextColor={colors.textMuted} 
            value={name} 
            onChangeText={setName} 
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Pick a theme color</Text>
          <View style={styles.gridContainer}>
            {COLORS.map(c => (
              <TouchableOpacity 
                key={c} 
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]} 
                onPress={() => { Haptics.selectionAsync(); setColor(c); }} 
              />
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Choose an icon</Text>
          <View style={styles.gridContainer}>
            {EMOJIS.map(e => (
              <TouchableOpacity 
                key={e} 
                style={[
                  styles.emojiBtn, 
                  { backgroundColor: colors.surface }, 
                  emoji === e && { backgroundColor: color + '20', borderColor: color }
                ]} 
                onPress={() => { Haptics.selectionAsync(); setEmoji(e); }}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Set Your Limits</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>How much are you planning to spend?</Text>

      <View style={[styles.heroCardShadow, { backgroundColor: color, marginTop: 24 }]}>
        <LinearGradient colors={[color, color + '99']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <Text style={styles.heroAmount}>
            {totalAmount > 0 ? `₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}
          </Text>
          <View style={styles.heroLabelContainer}>
            <Text style={styles.heroLabel}>TOTAL BUDGET</Text>
          </View>
        </LinearGradient>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 12, marginBottom: 16 }]}>Tap a category to set its limit</Text>
      
      {EXPENSE_CATEGORIES.map((c, index) => {
        const allocated = categories.find(cat => cat.categoryId === c.id);
        const hasAmount = allocated && allocated.amount > 0;
        return (
          <TouchableOpacity 
            key={c.id} 
            style={[
              styles.catItem, 
              { backgroundColor: colors.surface },
              hasAmount && { borderColor: color, borderWidth: 1 }
            ]}
            onPress={() => openCatModal(c.id)}
          >
            <View style={[styles.catIconContainer, { backgroundColor: colors.background }]}>
              <Text style={styles.catEmoji}>{c.emoji}</Text>
            </View>
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: colors.text }]}>{c.label}</Text>
              {hasAmount ? (
                <Text style={[styles.catAmount, { color: color }]}>₱{allocated.amount.toLocaleString()}</Text>
              ) : (
                <Text style={[styles.catAmount, { color: colors.textMuted, fontFamily: 'Inter-Regular', fontSize: 13 }]}>Not Set</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        );
      })}

      <View style={[styles.card, { backgroundColor: colors.surface, marginTop: 24 }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>How often does this renew?</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.background }]}>
            {PERIODS.map((p) => (
              <TouchableOpacity 
                key={p.id} 
                style={[styles.segmentBtn, period === p.id && { backgroundColor: color, shadowColor: color, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }]} 
                onPress={() => { Haptics.selectionAsync(); setPeriod(p.id); }}
              >
                <Text style={[styles.segmentLabel, { color: colors.textMuted }, period === p.id && { color: '#fff' }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <View style={styles.flex1}>
            <Text style={[styles.label, { color: colors.textMuted }]}>When does this start?</Text>
            <TouchableOpacity style={[styles.input, { backgroundColor: colors.background, justifyContent: 'center' }]} onPress={openCalendar}>
              <Text style={{ color: colors.text, textAlign: 'center', fontFamily: 'Inter-Medium' }}>{startDate || 'Select Date'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Duration (e.g. 1)</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, textAlign: 'center' }]} 
              value={multiplier} 
              onChangeText={setMultiplier} 
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Ready to save?</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textMuted }]}>Review your budget details below.</Text>
      
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: color, borderWidth: 2 }]}>
        <View style={styles.summaryTopRow}>
          <View style={[styles.summaryEmoji, { backgroundColor: color + '20' }]}>
            <Text style={{ fontSize: 32 }}>{emoji}</Text>
          </View>
          <View style={styles.summaryTitleCol}>
            <Text style={[styles.summaryName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.summaryPeriod, { color: colors.textMuted }]}>{period} • starts {startDate}</Text>
          </View>
        </View>
        <View style={styles.summaryTotalBox}>
          <Text style={[styles.summaryTotalLabel, { color: colors.textMuted }]}>TOTAL BUDGET</Text>
          <Text style={[styles.summaryTotalVal, { color: colors.text }]}>₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24, marginBottom: 12 }]}>Included Categories</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {categories.map((c, i) => {
          const catInfo = EXPENSE_CATEGORIES.find(e => e.id === c.categoryId);
          return (
            <View key={c.categoryId} style={[styles.summaryCatRow, i < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderAlt }]}>
              <Text style={{ fontSize: 20 }}>{catInfo?.emoji}</Text>
              <Text style={[styles.summaryCatName, { color: colors.text }]}>{catInfo?.label}</Text>
              <Text style={[styles.summaryCatAmount, { color: colors.text }]}>₱{c.amount.toLocaleString()}</Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.wrapper}>
      {/* Step Progress Indicators */}
      <View style={styles.progressHeader}>
        {[1, 2, 3].map(s => (
          <View key={s} style={[styles.progressDot, { backgroundColor: s <= step ? colors.primary : colors.borderAlt }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.borderAlt }]}>
        {step > 1 ? (
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderAlt }]} onPress={prevStep}>
            <Text style={[styles.footerBtnText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerBtn} />
        )}
        
        {step < 3 ? (
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.primary }]} onPress={nextStep}>
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>{loading ? 'Saving...' : 'Create Budget'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderCalendarModal()}
      {renderCategoryModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  progressDot: { height: 6, width: 24, borderRadius: 3 },
  scrollContent: { paddingBottom: 24, paddingHorizontal: 4 },
  stepContainer: { flex: 1, paddingTop: 16 },
  stepTitle: { fontFamily: 'Inter-Bold', fontSize: 28, marginBottom: 4 },
  stepSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15 },
  
  card: { padding: 24, borderRadius: 28, gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontFamily: 'Inter-Regular', fontSize: 16 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, paddingVertical: 4 },
  colorDot: { width: '22%', height: 48, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  colorDotSelected: { borderWidth: 4, borderColor: '#fff' },
  emojiBtn: { width: '22%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 2, borderColor: 'transparent' },
  emojiText: { fontSize: 36, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' },
  
  // Step 2 styles
  heroCardShadow: { marginHorizontal: 4, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8, borderRadius: 28, marginBottom: 20, marginTop: 4 },
  heroCard: { paddingVertical: 32, paddingHorizontal: 20, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroAmount: { fontFamily: 'Inter-Bold', fontSize: 38, color: '#fff', marginBottom: 2 },
  heroLabelContainer: { alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  
  segmentedControl: { flexDirection: 'row', padding: 4, borderRadius: 16 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontFamily: 'Inter-Medium', fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 16 },
  
  catItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  catIconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  catEmoji: { fontSize: 24 },
  catInfo: { flex: 1, gap: 2 },
  catName: { fontFamily: 'Inter-Medium', fontSize: 16 },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: 15 },
  
  // Step 3 styles
  summaryCard: { borderRadius: 24, padding: 20, marginTop: 24 },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  summaryEmoji: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  summaryTitleCol: { flex: 1 },
  summaryName: { fontFamily: 'Inter-Bold', fontSize: 22, marginBottom: 4 },
  summaryPeriod: { fontFamily: 'Inter-Medium', fontSize: 13, textTransform: 'capitalize' },
  summaryTotalBox: { alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  summaryTotalLabel: { fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  summaryTotalVal: { fontFamily: 'Inter-Bold', fontSize: 32 },
  
  summaryCatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  summaryCatName: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 16 },
  summaryCatAmount: { fontFamily: 'Inter-SemiBold', fontSize: 16 },

  // Footer
  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, gap: 16 },
  footerBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  catModal: { width: '100%', borderRadius: 28, padding: 24, alignItems: 'center' },
  catModalHeader: { alignItems: 'center', marginBottom: 24 },
  catModalIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  catModalTitle: { fontFamily: 'Inter-Bold', fontSize: 22, marginBottom: 4 },
  catModalSub: { fontFamily: 'Inter-Medium', fontSize: 14 },
  catModalInput: { width: '100%', fontSize: 32, fontFamily: 'Inter-Bold', textAlign: 'center', paddingVertical: 20, borderRadius: 20, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalActionBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontFamily: 'Inter-SemiBold', fontSize: 16 },

  calModal: { width: '100%', borderRadius: 28, padding: 20 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  calMonthText: { fontFamily: 'Inter-Bold', fontSize: 18 },
  calWeekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  calWeekDay: { fontFamily: 'Inter-Medium', fontSize: 13, width: 32, textAlign: 'center' },
  calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calDayCell: { width: '14.28%', height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  calDayText: { fontFamily: 'Inter-Medium', fontSize: 15 },
  calCloseBtn: { marginTop: 12, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  calCloseBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
