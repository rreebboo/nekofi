import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { Transaction } from '@/types/transaction';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useThemeColors } from '@/hooks/useThemeColors';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Single transaction row card.
 */
export function TransactionItem({ transaction, onPress }: Props) {
  const colors = useThemeColors();
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.text; // Use text color for expenses to be more neutral/modern like image? Wait, the design has expenses as white text usually. Let's stick to neutral for expense, or the theme expense color. I will use the theme expense color but slightly muted, or just text color to look cleaner. Let's use standard amount colors for clarity.
  const amountPrefix = isIncome ? '+' : '-';
  
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Icon based on category (fallback)
  const getIcon = () => {
    switch (transaction.category.toLowerCase()) {
      case 'house rent': return 'home-outline';
      case 'internet bill': return 'globe-outline';
      case 'groceries': return 'cart-outline';
      case 'taxes': return 'document-text-outline';
      default: return isIncome ? 'arrow-down-outline' : 'arrow-up-outline';
    }
  };

  return (
    <AnimatedPressable 
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderAlt }, animatedStyle]} 
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <View style={[styles.iconContainer, { backgroundColor: isIncome ? `${colors.income}15` : `${colors.expense}15` }]}>
        <Ionicons
          name={getIcon()}
          size={22}
          color={isIncome ? colors.income : colors.expense}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>{transaction.description}</Text>
        <Text style={[styles.category, { color: colors.textMuted }]}>{transaction.category} · {formatDate(transaction.date)}</Text>
      </View>

      <Text style={[styles.amount, { color: colors.text }]}>
        {amountPrefix}{formatCurrency(transaction.amount, transaction.currency)}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(20), padding: moderateScale(16), marginBottom: moderateScale(12), borderWidth: 1 },
  iconContainer: { marginRight: moderateScale(14), width: scale(44), height: verticalScale(44), borderRadius: moderateScale(22), alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  description: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15), marginBottom: moderateScale(4) },
  category: { fontFamily: 'Inter-Medium', fontSize: moderateScale(12) },
  amount: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },
});
