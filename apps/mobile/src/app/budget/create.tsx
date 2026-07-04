import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BudgetForm } from '@/components/forms/BudgetForm';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

export default function CreateBudgetScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: colors.text }]}>New Budget</Text>
        <View style={{ width: 24 }} />
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: 'Inter-Bold', fontSize: 18 },
  content: { flex: 1, paddingHorizontal: 20 },
});
