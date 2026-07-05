import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

import { useBudgetStore } from '@/stores/budgetStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreateBudgetGroupDto } from '@/types/budget';
import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { OriginDialog, OriginCoordinate } from '@/components/ui/OriginDialog';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Props {
  onSuccess: () => void;
}

const PERIODS = [
  { id: 'custom', label: 'Custom' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
] as const;

const COLORS = ['#10B981', '#4F46E5', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];
const EMOJIS = ['💰', '🚗', '🏠', '🛒', '✈️', '🍔', '🎁', '🎓', '🏥', '🎮', '👗', '🐾'];

const getStartOfPeriod = (p: 'custom'|'monthly'|'yearly') => {
  const d = new Date();
  if (p === 'custom') {
    // Custom period defaults to today
  } else if (p === 'monthly') {
    d.setDate(1);
  } else if (p === 'yearly') {
    d.setMonth(0, 1);
  }
  return d.toISOString().split('T')[0];
};

const calculateEndDate = (startStr: string, p: 'custom'|'monthly'|'yearly', mult: number) => {
  const d = new Date(startStr);
  if (p === 'monthly') {
    d.setMonth(d.getMonth() + mult);
    d.setDate(d.getDate() - 1);
  } else if (p === 'yearly') {
    d.setFullYear(d.getFullYear() + mult);
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString();
};

const getStartOfCurrentWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
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
  const [period, setPeriod] = useState<'custom' | 'monthly' | 'yearly'>('monthly');
  const [multiplier, setMultiplier] = useState('1');
  const [startDate, setStartDate] = useState(getStartOfPeriod('monthly'));
  const [endDate, setEndDate] = useState(getStartOfPeriod('monthly'));
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [categories, setCategories] = useState<{categoryId: string, amount: number}[]>([]);

  const [isCatModalVisible, setIsCatModalVisible] = useState(false);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState('');
  const [catOrigin, setCatOrigin] = useState<OriginCoordinate | null>(null);

  // Calendar Modal state
  const [isCalVisible, setIsCalVisible] = useState(false);
  const [calTarget, setCalTarget] = useState<'start'|'end'>('start');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calOrigin, setCalOrigin] = useState<OriginCoordinate | null>(null);

  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  useEffect(() => {
    const newStart = getStartOfPeriod(period);
    setStartDate(newStart);
    setEndDate(newStart);
  }, [period]);

  const totalAmount = categories.reduce((sum, c) => sum + c.amount, 0);

  const openCatModal = (id: string, e?: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (e && e.nativeEvent) {
      setCatOrigin({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
    }
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

  const openCalendar = (target: 'start'|'end' = 'start', e?: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (e && e.nativeEvent) {
      setCalOrigin({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
    }
    setCalTarget(target);
    const d = new Date(target === 'start' ? startDate : endDate);
    if (!isNaN(d.getTime())) {
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    }
    setIsCalVisible(true);
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
        endDate: period === 'custom' ? new Date(endDate + 'T23:59:59Z').toISOString() : calculateEndDate(startDate, period, multNum),
        color,
        emoji,
        categories
      };
      const newBudgets = await createBudgetGroup(dto);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessCode(newBudgets[0].inviteCode || null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderCalendarModal = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const startOfCurrentWeek = getStartOfCurrentWeek();

    return (
      <OriginDialog visible={isCalVisible} onClose={() => setIsCalVisible(false)} origin={calOrigin}>
          <View style={[styles.calModal, { backgroundColor: colors.surface }]}>
            {period === 'yearly' && (
              <View>
                <Text style={[styles.calMonthText, { color: colors.text, marginBottom: moderateScale(20), textAlign: 'center' }]}>Select Year</Text>
                <View style={styles.calGrid}>
                  {Array.from({ length: 12 }, (_, i) => currentYear + i).map(year => {
                    const isSelected = startDate.startsWith(`${year}`);
                    return (
                      <AnimatedPressable 
                        key={year} 
                        style={[styles.calGridCell, isSelected && { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setStartDate(`${year}-01-01`);
                          setIsCalVisible(false);
                        }}
                      >
                        <Text style={[styles.calGridText, { color: isSelected ? '#fff' : colors.text }]}>{year}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}

            {period === 'monthly' && (
              <View>
                <View style={styles.calHeader}>
                  <AnimatedPressable 
                    onPress={() => setCalYear(y => y - 1)}
                    disabled={calYear <= currentYear}
                    style={{ opacity: calYear <= currentYear ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                  </AnimatedPressable>
                  <Text style={[styles.calMonthText, { color: colors.text }]}>{calYear}</Text>
                  <AnimatedPressable onPress={() => setCalYear(y => y + 1)}>
                    <Ionicons name="chevron-forward" size={24} color={colors.text} />
                  </AnimatedPressable>
                </View>
                <View style={styles.calGrid}>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((monthStr, i) => {
                    const isDisabled = calYear === currentYear && i < currentMonth;
                    const isSelected = startDate === `${calYear}-${(i+1).toString().padStart(2, '0')}-01`;
                    return (
                      <AnimatedPressable 
                        key={monthStr} 
                        style={[styles.calGridCell, isSelected && { backgroundColor: colors.primary }, isDisabled && { opacity: 0.3 }]}
                        disabled={isDisabled}
                        onPress={() => {
                          setStartDate(`${calYear}-${(i+1).toString().padStart(2, '0')}-01`);
                          setIsCalVisible(false);
                        }}
                      >
                        <Text style={[styles.calGridText, { color: isSelected ? '#fff' : colors.text }]}>{monthStr}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            )}

            {period === 'custom' && (() => {
              const daysInMonth = getDaysInMonth(calYear, calMonth);
              const firstDay = getFirstDayOfMonth(calYear, calMonth);
              const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              const prevMonthDisabled = calYear < currentYear || (calYear === currentYear && calMonth <= currentMonth);

              const gridDates: { year: number, month: number, day: number, isCurrentMonth: boolean }[] = [];
              const prevMonth = calMonth === 0 ? 11 : calMonth - 1;
              const prevMonthYear = calMonth === 0 ? calYear - 1 : calYear;
              const prevMonthDays = getDaysInMonth(prevMonthYear, prevMonth);
              for (let i = 0; i < firstDay; i++) {
                gridDates.push({ year: prevMonthYear, month: prevMonth, day: prevMonthDays - firstDay + i + 1, isCurrentMonth: false });
              }
              for (let i = 1; i <= daysInMonth; i++) {
                gridDates.push({ year: calYear, month: calMonth, day: i, isCurrentMonth: true });
              }
              const nextMonth = calMonth === 11 ? 0 : calMonth + 1;
              const nextMonthYear = calMonth === 11 ? calYear + 1 : calYear;
              const rows = Math.ceil(gridDates.length / 7);
              const nextDaysCount = rows * 7 - gridDates.length;
              for (let i = 1; i <= nextDaysCount; i++) {
                gridDates.push({ year: nextMonthYear, month: nextMonth, day: i, isCurrentMonth: false });
              }

              const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
              const selStartObj = new Date(sYear, sMonth - 1, sDay);
              
              const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
              const selEndObj = new Date(eYear, eMonth - 1, eDay);

              return (
                <View>
                  <Text style={[styles.calMonthText, { color: colors.text, marginBottom: moderateScale(12), textAlign: 'center' }]}>
                    {calTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
                  </Text>
                  <View style={styles.calHeader}>
                    <AnimatedPressable 
                      onPress={() => {
                        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                        else setCalMonth(m => m - 1);
                      }}
                    >
                      <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </AnimatedPressable>
                    <Text style={[styles.calMonthText, { color: colors.text }]}>{monthNames[calMonth]} {calYear}</Text>
                    <AnimatedPressable onPress={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                      else setCalMonth(m => m + 1);
                    }}>
                      <Ionicons name="chevron-forward" size={24} color={colors.text} />
                    </AnimatedPressable>
                  </View>
                  <View style={styles.calWeekRow}>
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <Text key={d} style={[styles.calWeekDay, { color: colors.textMuted }]}>{d}</Text>
                    ))}
                  </View>
                  <View style={styles.calDaysGrid}>
                    {gridDates.map((item, index) => {
                      const cellDate = new Date(item.year, item.month, item.day);
                      let isDisabled = false;
                      if (calTarget === 'end') {
                        // End date must be after or equal to start date
                        isDisabled = cellDate < selStartObj;
                      }
                      
                      const isExactStart = cellDate.getTime() === selStartObj.getTime();
                      const isExactEnd = cellDate.getTime() === selEndObj.getTime();
                      const isInRange = cellDate >= selStartObj && cellDate <= selEndObj;

                      return (
                        <AnimatedPressable 
                          key={index} 
                          style={[
                            styles.calDayCell, 
                            (isExactStart || isExactEnd) && { backgroundColor: color, borderRadius: moderateScale(20) },
                            isInRange && !(isExactStart || isExactEnd) && { backgroundColor: color + '30', borderRadius: moderateScale(20) },
                            isDisabled && { opacity: 0.3 },
                            !item.isCurrentMonth && !isDisabled && { opacity: 0.4 }
                          ]} 
                          disabled={isDisabled}
                          onPress={() => {
                            const m = (item.month + 1).toString().padStart(2, '0');
                            const dayStr = item.day.toString().padStart(2, '0');
                            const dateStr = `${item.year}-${m}-${dayStr}`;
                            
                            if (calTarget === 'start') {
                              setStartDate(dateStr);
                            } else {
                              setEndDate(dateStr);
                            }
                          }}
                        >
                          <Text style={[styles.calDayText, { color: (isExactStart || isExactEnd) ? '#fff' : colors.text }]}>{item.day}</Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {period === 'custom' ? (
              <View style={{ flexDirection: 'row', gap: moderateScale(12), marginTop: moderateScale(16) }}>
                <AnimatedPressable style={[styles.calCloseBtn, { flex: 1, backgroundColor: colors.background }]} onPress={() => setIsCalVisible(false)}>
                  <Text style={[styles.calCloseBtnText, { color: colors.text }]}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable 
                  style={[styles.calCloseBtn, { flex: 1, backgroundColor: color }]} 
                  onPress={() => {
                    if (calTarget === 'start') setCalTarget('end');
                    else setIsCalVisible(false);
                  }}
                >
                  <Text style={[styles.calCloseBtnText, { color: '#fff' }]}>{calTarget === 'start' ? 'Set Start Date' : 'Set Range'}</Text>
                </AnimatedPressable>
              </View>
            ) : (
              <AnimatedPressable style={[styles.calCloseBtn, { backgroundColor: colors.background, marginTop: moderateScale(16) }]} onPress={() => setIsCalVisible(false)}>
                <Text style={[styles.calCloseBtnText, { color: colors.text }]}>Cancel</Text>
              </AnimatedPressable>
            )}
          </View>
      </OriginDialog>
    );
  };

  const renderCategoryModal = () => {
    const catInfo = EXPENSE_CATEGORIES.find(c => c.id === activeCatId);
    return (
      <OriginDialog visible={isCatModalVisible} onClose={() => setIsCatModalVisible(false)} origin={catOrigin}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{width: '100%'}}>
          <View style={[styles.catModal, { backgroundColor: colors.surface }]}>
              <View style={styles.catModalHeader}>
                <View style={[styles.catModalIcon, { backgroundColor: colors.background }]}>
                  <Text style={{ fontSize: moderateScale(32) }}>{catInfo?.emoji}</Text>
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
                <AnimatedPressable style={[styles.modalActionBtn, { backgroundColor: colors.background }]} onPress={() => setIsCatModalVisible(false)}>
                  <Text style={[styles.modalActionText, { color: colors.text }]}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable style={[styles.modalActionBtn, { backgroundColor: colors.primary }]} onPress={saveCategory}>
                  <Text style={[styles.modalActionText, { color: '#fff' }]}>Save</Text>
                </AnimatedPressable>
              </View>
            </View>
        </KeyboardAvoidingView>
      </OriginDialog>
    );
  };

  const renderSuccessModal = () => {
    return (
      <Modal visible={!!successCode} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.successModal, { backgroundColor: colors.surface }]}>
            <View style={[styles.successIcon, { backgroundColor: color + '20' }]}>
              <Text style={{ fontSize: moderateScale(48) }}>{emoji}</Text>
              <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: colors.surface, borderRadius: moderateScale(16), padding: moderateScale(2) }}>
                <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Budget created!</Text>
            <Text style={[styles.successSub, { color: colors.textMuted }]}>Share this invite code with others to collaborate:</Text>
            
            <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.borderAlt }]}>
              <Text style={[styles.codeText, { color: colors.text }]}>{successCode}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.background }]} onPress={() => {
                setSuccessCode(null);
                onSuccess();
              }}>
                <Text style={[styles.modalActionText, { color: colors.text }]}>Done</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: colors.primary }]} onPress={async () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await Clipboard.setStringAsync(successCode || '');
                Alert.alert('Copied!', 'Invite code copied to clipboard.');
              }}>
                <Text style={[styles.modalActionText, { color: '#fff' }]}>Copy Code</Text>
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
      
      <View style={{ gap: moderateScale(24), marginTop: moderateScale(32) }}>
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
              <AnimatedPressable 
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
              <AnimatedPressable 
                key={e} 
                style={[
                  styles.emojiBtn, 
                  { backgroundColor: colors.surface }, 
                  emoji === e && { backgroundColor: color + '20', borderColor: color }
                ]} 
                onPress={() => { Haptics.selectionAsync(); setEmoji(e); }}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </AnimatedPressable>
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

      <View style={[styles.heroCardShadow, { backgroundColor: color, marginTop: moderateScale(24) }]}>
        <LinearGradient colors={[color, color + '99']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <Text style={styles.heroAmount}>
            {totalAmount > 0 ? `₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₱0.00'}
          </Text>
          <View style={styles.heroLabelContainer}>
            <Text style={styles.heroLabel}>TOTAL BUDGET</Text>
          </View>
        </LinearGradient>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: moderateScale(12), marginBottom: moderateScale(16) }]}>Tap a category to set its limit</Text>
      
      {EXPENSE_CATEGORIES.map((c, index) => {
        const allocated = categories.find(cat => cat.categoryId === c.id);
        const hasAmount = allocated && allocated.amount > 0;
        return (
          <AnimatedPressable 
            key={c.id} 
            style={[
              styles.catItem, 
              { backgroundColor: colors.surface },
              hasAmount && { borderColor: color, borderWidth: 1 }
            ]}
            onPress={(e) => openCatModal(c.id, e)}
          >
            <View style={[styles.catIconContainer, { backgroundColor: colors.background }]}>
              <Text style={styles.catEmoji}>{c.emoji}</Text>
            </View>
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: colors.text }]}>{c.label}</Text>
              {hasAmount ? (
                <Text style={[styles.catAmount, { color: color }]}>₱{allocated.amount.toLocaleString()}</Text>
              ) : (
                <Text style={[styles.catAmount, { color: colors.textMuted, fontFamily: 'Inter-Regular', fontSize: moderateScale(13) }]}>Not Set</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </AnimatedPressable>
        );
      })}

      <View style={[styles.card, { backgroundColor: colors.surface, marginTop: moderateScale(24) }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textMuted }]}>How often does this renew?</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.background }]}>
            {PERIODS.map((p) => (
              <AnimatedPressable 
                key={p.id} 
                style={[styles.segmentBtn, period === p.id && { backgroundColor: color, shadowColor: color, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }]} 
                onPress={() => { Haptics.selectionAsync(); setPeriod(p.id); }}
              >
                <Text style={[styles.segmentLabel, { color: colors.textMuted }, period === p.id && { color: '#fff' }]}>{p.label}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>
        {period === 'custom' ? (
          <View style={[styles.row, { marginTop: moderateScale(4), alignItems: 'flex-end' }]}>
            <View style={{ flex: 3 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Select Date Range</Text>
              <AnimatedPressable style={[styles.input, { backgroundColor: colors.background, justifyContent: 'center', height: verticalScale(56) }]} onPress={(e) => openCalendar('start', e)}>
                <Text style={{ color: colors.text, textAlign: 'center', fontFamily: 'Inter-Medium', fontSize: moderateScale(13) }} numberOfLines={1} adjustsFontSizeToFit>
                  {startDate && endDate ? `${startDate} to ${endDate}` : 'Select Range'}
                </Text>
              </AnimatedPressable>
            </View>
            <View style={styles.flex1}>
              <View style={{ height: verticalScale(76), justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Days</Text>
                <View style={{ height: verticalScale(56), justifyContent: 'center' }}>
                  <Text style={{ color: colors.text, textAlign: 'center', fontFamily: 'Inter-SemiBold', fontSize: moderateScale(20) }}>
                    {(() => {
                      if (!startDate || !endDate) return '-';
                      const s = new Date(startDate);
                      const e = new Date(endDate);
                      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return isNaN(diff) || diff < 1 ? '-' : diff;
                    })()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.row, { marginTop: moderateScale(4), alignItems: 'flex-end' }]}>
            <View>
              <Text style={[styles.label, { color: colors.textMuted }]}>When does this start?</Text>
              <AnimatedPressable style={[styles.input, { backgroundColor: colors.background, justifyContent: 'center', height: verticalScale(56) }]} onPress={(e) => openCalendar('start', e)}>
                <Text style={{ color: colors.text, textAlign: 'center', fontFamily: 'Inter-Medium' }}>{startDate || 'Select Date'}</Text>
              </AnimatedPressable>
            </View>
            <View style={styles.flex1}>
              <View>
                <Text style={[styles.label, { color: colors.textMuted }]}>Duration</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, textAlign: 'center', height: verticalScale(56) }]} 
                  value={multiplier} 
                  onChangeText={setMultiplier} 
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}
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
            <Text style={{ fontSize: moderateScale(32) }}>{emoji}</Text>
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

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: moderateScale(24), marginBottom: moderateScale(12) }]}>Included Categories</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {categories.map((c, i) => {
          const catInfo = EXPENSE_CATEGORIES.find(e => e.id === c.categoryId);
          return (
            <View key={c.categoryId} style={[styles.summaryCatRow, i < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderAlt }]}>
              <Text style={{ fontSize: moderateScale(20) }}>{catInfo?.emoji}</Text>
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
        {step > 1 && (
          <AnimatedPressable style={[styles.footerBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderAlt }]} onPress={prevStep}>
            <Text style={[styles.footerBtnText, { color: colors.text }]}>Back</Text>
          </AnimatedPressable>
        )}
        
        {step < 3 ? (
          <AnimatedPressable style={[styles.footerBtn, { backgroundColor: colors.primary }]} onPress={nextStep}>
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>Continue</Text>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable style={[styles.footerBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            <Text style={[styles.footerBtnText, { color: '#fff' }]}>{loading ? 'Saving...' : 'Create Budget'}</Text>
          </AnimatedPressable>
        )}
      </View>

      {renderCalendarModal()}
      {renderCategoryModal()}
      {renderSuccessModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  progressHeader: { flexDirection: 'row', justifyContent: 'center', gap: moderateScale(8), paddingVertical: moderateScale(12) },
  progressDot: { height: verticalScale(6), width: scale(24), borderRadius: moderateScale(3) },
  scrollContent: { paddingBottom: moderateScale(24), paddingHorizontal: moderateScale(4) },
  stepContainer: { flex: 1, paddingTop: moderateScale(16) },
  stepTitle: { fontFamily: 'Inter-Bold', fontSize: moderateScale(28), marginBottom: moderateScale(4) },
  stepSubtitle: { fontFamily: 'Inter-Regular', fontSize: moderateScale(15) },
  
  card: { padding: moderateScale(24), borderRadius: moderateScale(28), gap: moderateScale(20) },
  inputGroup: { gap: moderateScale(8) },
  label: { fontFamily: 'Inter-Medium', fontSize: moderateScale(13), marginLeft: moderateScale(4), textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: moderateScale(16), paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(16), fontFamily: 'Inter-Regular', fontSize: moderateScale(16) },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, paddingVertical: moderateScale(4) },
  colorDot: { width: '22%', height: verticalScale(48), borderRadius: moderateScale(12), elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  colorDotSelected: { borderWidth: 4, borderColor: '#fff' },
  emojiBtn: { width: '22%', aspectRatio: 1, borderRadius: moderateScale(999), alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 2, borderColor: 'transparent' },
  emojiText: { fontSize: moderateScale(36), includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' },
  
  // Step 2 styles
  heroCardShadow: { marginHorizontal: moderateScale(4), elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(3) }, shadowOpacity: 0.15, shadowRadius: 8, borderRadius: moderateScale(28), marginBottom: moderateScale(20), marginTop: moderateScale(4) },
  heroCard: { paddingVertical: moderateScale(32), paddingHorizontal: moderateScale(20), borderRadius: moderateScale(28), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroAmount: { fontFamily: 'Inter-Bold', fontSize: moderateScale(38), color: '#fff', marginBottom: moderateScale(2) },
  heroLabelContainer: { alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(12), color: 'rgba(255,255,255,0.9)', letterSpacing: 1 },
  
  segmentedControl: { flexDirection: 'row', padding: moderateScale(4), borderRadius: moderateScale(16) },
  segmentBtn: { flex: 1, paddingVertical: moderateScale(12), borderRadius: moderateScale(12), alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14) },
  row: { flexDirection: 'row', gap: moderateScale(12) },
  flex1: { flex: 1 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: moderateScale(16) },
  
  catItem: { flexDirection: 'row', alignItems: 'center', padding: moderateScale(16), borderRadius: moderateScale(20), marginBottom: moderateScale(8), borderWidth: 1, borderColor: 'transparent' },
  catIconContainer: { width: scale(48), height: verticalScale(48), borderRadius: moderateScale(24), alignItems: 'center', justifyContent: 'center', marginRight: moderateScale(16) },
  catEmoji: { fontSize: moderateScale(24) },
  catInfo: { flex: 1, gap: moderateScale(2) },
  catName: { fontFamily: 'Inter-Medium', fontSize: moderateScale(16) },
  catAmount: { fontFamily: 'Inter-Bold', fontSize: moderateScale(15) },
  
  // Step 3 styles
  summaryCard: { borderRadius: moderateScale(24), padding: moderateScale(20), marginTop: moderateScale(24) },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(20) },
  summaryEmoji: { width: scale(56), height: verticalScale(56), borderRadius: moderateScale(28), alignItems: 'center', justifyContent: 'center', marginRight: moderateScale(16) },
  summaryTitleCol: { flex: 1 },
  summaryName: { fontFamily: 'Inter-Bold', fontSize: moderateScale(22), marginBottom: moderateScale(4) },
  summaryPeriod: { fontFamily: 'Inter-Medium', fontSize: moderateScale(13), textTransform: 'capitalize' },
  summaryTotalBox: { alignItems: 'center', paddingTop: moderateScale(16), borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  summaryTotalLabel: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(11), letterSpacing: 1, marginBottom: moderateScale(4) },
  summaryTotalVal: { fontFamily: 'Inter-Bold', fontSize: moderateScale(32) },
  
  summaryCatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(12), gap: moderateScale(12) },
  summaryCatName: { flex: 1, fontFamily: 'Inter-Medium', fontSize: moderateScale(16) },
  summaryCatAmount: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },

  // Footer
  footer: { flexDirection: 'row', padding: moderateScale(20), borderTopWidth: 1, gap: moderateScale(16) },
  footerBtn: { flex: 1, paddingVertical: moderateScale(16), borderRadius: moderateScale(16), alignItems: 'center', justifyContent: 'center' },
  footerBtnText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: moderateScale(20) },
  catModal: { width: '100%', borderRadius: moderateScale(28), padding: moderateScale(24), alignItems: 'center' },
  catModalHeader: { alignItems: 'center', marginBottom: moderateScale(24) },
  catModalIcon: { width: scale(72), height: verticalScale(72), borderRadius: moderateScale(36), alignItems: 'center', justifyContent: 'center', marginBottom: moderateScale(16) },
  catModalTitle: { fontFamily: 'Inter-Bold', fontSize: moderateScale(22), marginBottom: moderateScale(4) },
  catModalSub: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14) },
  catModalInput: { width: '100%', fontSize: moderateScale(32), fontFamily: 'Inter-Bold', textAlign: 'center', paddingVertical: moderateScale(20), borderRadius: moderateScale(20), marginBottom: moderateScale(24) },
  modalActions: { flexDirection: 'row', gap: moderateScale(12), width: '100%' },
  modalActionBtn: { flex: 1, paddingVertical: moderateScale(16), borderRadius: moderateScale(16), alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },

  calModal: { width: '100%', borderRadius: moderateScale(28), padding: moderateScale(20) },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: moderateScale(20) },
  calMonthText: { fontFamily: 'Inter-Bold', fontSize: moderateScale(18) },
  calWeekRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: moderateScale(12) },
  calWeekDay: { fontFamily: 'Inter-Medium', fontSize: moderateScale(13), width: scale(32), textAlign: 'center' },
  calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calDayCell: { width: '14.28%', height: verticalScale(40), alignItems: 'center', justifyContent: 'center', marginBottom: moderateScale(8) },
  calDayText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(15) },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: moderateScale(12) },
  calGridCell: { width: '30%', paddingVertical: moderateScale(16), alignItems: 'center', borderRadius: moderateScale(16) },
  calGridText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },
  calCloseBtn: { marginTop: moderateScale(12), paddingVertical: moderateScale(16), borderRadius: moderateScale(16), alignItems: 'center' },
  calCloseBtnText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },
  
  successModal: { width: '100%', borderRadius: moderateScale(28), padding: moderateScale(24), alignItems: 'center' },
  successIcon: { width: scale(80), height: verticalScale(80), borderRadius: moderateScale(40), alignItems: 'center', justifyContent: 'center', marginBottom: moderateScale(16) },
  successTitle: { fontFamily: 'Inter-Bold', fontSize: moderateScale(22), textAlign: 'center', marginBottom: moderateScale(8) },
  successSub: { fontFamily: 'Inter-Regular', fontSize: moderateScale(15), textAlign: 'center', marginBottom: moderateScale(24), paddingHorizontal: moderateScale(12) },
  codeBox: { width: '100%', paddingVertical: moderateScale(20), borderRadius: moderateScale(16), borderWidth: 1, alignItems: 'center', marginBottom: moderateScale(24) },
  codeText: { fontFamily: 'Inter-Bold', fontSize: moderateScale(32), letterSpacing: 4 },
  successActions: { width: '100%', gap: moderateScale(12) },
});
