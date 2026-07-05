import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

export default function CreateBudgetScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>New Budget</Text>
        <View style={{ width: scale(24) }} />
      </View>
      <View style={styles.content}>
        <BudgetForm onSuccess={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(60),
    paddingBottom: moderateScale(16),
  },
  backBtn: { padding: moderateScale(4) },
  title: { fontFamily: 'Inter-Bold', fontSize: moderateScale(18) },
  content: { flex: 1, paddingHorizontal: moderateScale(20) },
});
