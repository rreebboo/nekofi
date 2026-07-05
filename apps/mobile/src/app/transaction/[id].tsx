import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTransactionStore } from '@/stores/transactionStore';
import { formatDate } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/constants/categories';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { transactions, deleteTransaction } = useTransactionStore();
  const colors = useThemeColors();
  
  const transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const amountPrefix = isIncome ? '+ ₱' : '- ₱';
  
  const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  const categoryDetails = allCategories.find(c => c.id === transaction.category);

  const handleDelete = () => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
          deleteTransaction(transaction.id);
          router.back();
        } 
      }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transaction Details</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.backBtn}>
          <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.amountSection}>
          <View style={[styles.iconCircle, { backgroundColor: isIncome ? `${colors.income}20` : `${colors.expense}20` }]}>
            {categoryDetails ? (
              <Text style={styles.emoji}>{categoryDetails.emoji}</Text>
            ) : (
              <Ionicons name={isIncome ? "arrow-down" : "arrow-up"} size={32} color={amountColor} />
            )}
          </View>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.categoryName, { color: colors.textMuted }]}>
            {categoryDetails ? categoryDetails.label : transaction.category}
          </Text>
        </View>

        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Description</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{transaction.description}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Date</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(transaction.date)}</Text>
          </View>

          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Type</Text>
            <View style={[styles.typeBadge, { backgroundColor: isIncome ? `${colors.income}20` : `${colors.expense}20` }]}>
              <Text style={[styles.typeBadgeText, { color: amountColor }]}>
                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: moderateScale(20), paddingVertical: moderateScale(16) },
  backBtn: { width: scale(40), height: verticalScale(40), alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(18) },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(16) },
  scrollContent: { paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(40) },
  amountSection: { alignItems: 'center', marginVertical: moderateScale(32) },
  iconCircle: { width: scale(80), height: verticalScale(80), borderRadius: moderateScale(40), alignItems: 'center', justifyContent: 'center', marginBottom: moderateScale(16) },
  emoji: { fontSize: moderateScale(40) },
  amount: { fontFamily: 'Inter-Bold', fontSize: moderateScale(36), marginBottom: moderateScale(8) },
  categoryName: { fontFamily: 'Inter-Medium', fontSize: moderateScale(16) },
  detailsCard: { borderRadius: moderateScale(20), padding: moderateScale(20), borderWidth: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: moderateScale(12) },
  detailLabel: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14) },
  detailValue: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(14), flex: 1, textAlign: 'right', marginLeft: moderateScale(16) },
  divider: { height: 1, backgroundColor: 'rgba(150, 150, 150, 0.1)' },
  typeBadge: { paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(6), borderRadius: moderateScale(8) },
  typeBadgeText: { fontFamily: 'Inter-Bold', fontSize: moderateScale(12) },
});
