import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import type { Transaction } from '@/types/transaction';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '125, 168, 47';
};

interface Props {
  transactions: Transaction[];
}

/**
 * Dynamic Cashflow trend line chart for income and expense.
 */
export function SpendingChart({ transactions }: Props) {
  const colors = useThemeColors();

  const sortedDates = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let labels: string[] = [];
  let incomeData: number[] = [];
  let expenseData: number[] = [];
  let title = "Cashflow";

  if (sortedDates.length === 0) {
    labels = ['Today'];
    incomeData = [0];
    expenseData = [0];
    title = "Cashflow — Last 7 Days";
  } else {
    const firstDate = new Date(sortedDates[0].date);
    const lastDate = new Date();
    const diffDays = Math.max(1, Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (diffDays <= 31) {
      const numDays = Math.max(7, diffDays);
      title = `Cashflow — Last ${numDays} Days`;
      
      const datesList = Array.from({ length: numDays }, (_, i) => {
        const d = new Date(lastDate);
        d.setDate(d.getDate() - (numDays - 1 - i));
        return d.toISOString().split('T')[0];
      });

      labels = datesList.map((d) => {
        const date = new Date(d);
        if (numDays <= 7) {
          return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][date.getDay()];
        } else {
          return `${date.getDate()}/${date.getMonth() + 1}`;
        }
      });

      incomeData = datesList.map(day => 
        transactions.filter(t => t.type === 'income' && t.date.startsWith(day)).reduce((s, t) => s + t.amount, 0)
      );
      expenseData = datesList.map(day => 
        transactions.filter(t => t.type === 'expense' && t.date.startsWith(day)).reduce((s, t) => s + t.amount, 0)
      );

    } else {
      title = "Cashflow — Monthly Trend";
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const allMonths: string[] = [];
      let currentMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
      const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
      
      while (currentMonth <= endMonth) {
        allMonths.push(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      
      const displayMonths = allMonths.length > 6 ? allMonths.slice(-6) : allMonths;

      labels = displayMonths.map(m => {
        const [yyyy, mm] = m.split('-');
        return `${monthNames[parseInt(mm, 10) - 1]} '${yyyy.substring(2)}`;
      });

      incomeData = displayMonths.map(monthStr => 
        transactions.filter(t => t.type === 'income' && t.date.startsWith(monthStr)).reduce((s, t) => s + t.amount, 0)
      );
      expenseData = displayMonths.map(monthStr => 
        transactions.filter(t => t.type === 'expense' && t.date.startsWith(monthStr)).reduce((s, t) => s + t.amount, 0)
      );
    }
  }

  const hasIncome = incomeData.some(d => d > 0);
  const hasExpense = expenseData.some(d => d > 0);
  
  const finalIncome = hasIncome ? incomeData : incomeData.map(() => 0.01);
  const finalExpense = hasExpense ? expenseData : expenseData.map(() => 0.01);

  return (
    <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <LineChart
        data={{ 
          labels, 
          datasets: [
            { data: finalExpense, color: (opacity = 1) => `rgba(${hexToRgb(colors.expense)}, ${opacity})` },
            { data: finalIncome, color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})` }
          ] 
        }}
        width={width - 40}
        height={180}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          fillShadowGradientFromOpacity: 0.3,
          fillShadowGradientToOpacity: 0,
          useShadowColorFromDataset: true,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(${hexToRgb(colors.textMuted)}, ${opacity})`,
          labelColor: () => colors.textMuted,
          propsForDots: { r: '3', strokeWidth: '0' },
          propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4', strokeOpacity: 0.5 },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 24, padding: 16, borderWidth: 1, marginTop: 12 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -16 },
});
