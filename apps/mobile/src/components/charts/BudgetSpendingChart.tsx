import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import type { Transaction } from '@/types/transaction';
import type { BudgetGroup } from '@/types/budget';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '125, 168, 47';
};

interface Props {
  budget: BudgetGroup;
  transactions: Transaction[];
}

export function BudgetSpendingChart({ budget, transactions }: Props) {
  const colors = useThemeColors();

  const chartData = useMemo(() => {
    const start = new Date(budget.startDate);
    let labels: string[] = [];
    let data: number[] = [];

    if (budget.period === 'custom') {
      const end = budget.endDate ? new Date(budget.endDate) : new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays <= 14) {
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const dayStr = d.toISOString().split('T')[0];
          const dayTotal = transactions
            .filter(t => t.type === 'expense' && t.date.startsWith(dayStr))
            .reduce((sum, t) => sum + t.amount, 0);
          
          labels.push(diffDays <= 7 ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()] : `${d.getDate()}`);
          data.push(dayTotal);
        }
      } else {
        const chunks = 5;
        const daysPerChunk = Math.ceil(diffDays / chunks);
        for (let i = 0; i < chunks; i++) {
          labels.push(`P${i+1}`);
          data.push(0);
        }
        
        transactions.forEach(t => {
          if (t.type !== 'expense') return;
          const tDate = new Date(t.date);
          if (tDate >= start && tDate <= end) {
            const tDiffTime = tDate.getTime() - start.getTime();
            const tDiffDays = Math.floor(tDiffTime / (1000 * 60 * 60 * 24));
            const chunkIndex = Math.min(Math.floor(tDiffDays / daysPerChunk), chunks - 1);
            data[chunkIndex] += t.amount;
          }
        });
      }
    } else if (budget.period === 'monthly') {
      // 5 weeks
      labels = ['W1', 'W2', 'W3', 'W4', 'W5'];
      data = [0, 0, 0, 0, 0];
      
      transactions.forEach(t => {
        if (t.type !== 'expense') return;
        const tDate = new Date(t.date);
        if (tDate >= start) {
          const diffTime = Math.abs(tDate.getTime() - start.getTime());
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 31) {
            const weekIndex = Math.min(Math.floor(diffDays / 7), 4);
            data[weekIndex] += t.amount;
          }
        }
      });
    } else if (budget.period === 'yearly') {
      // 12 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < 12; i++) {
        const d = new Date(start);
        d.setMonth(start.getMonth() + i);
        labels.push(monthNames[d.getMonth()]);
        data.push(0);
      }
      
      transactions.forEach(t => {
        if (t.type !== 'expense') return;
        const tDate = new Date(t.date);
        if (tDate >= start) {
          const monthDiff = (tDate.getFullYear() - start.getFullYear()) * 12 + (tDate.getMonth() - start.getMonth());
          if (monthDiff >= 0 && monthDiff < 12) {
            data[monthDiff] += t.amount;
          }
        }
      });
    }

    // Ensure we have data
    if (data.every(d => d === 0)) {
       data = data.map(() => 0); // All 0s
    }

    return { labels, datasets: [{ data }] };
  }, [budget, transactions]);

  // If all data points are 0, chart kit sometimes errors out or shows poorly.
  const hasData = chartData.datasets[0].data.some(d => d > 0);
  const dataToUse = hasData ? chartData : { ...chartData, datasets: [{ data: chartData.datasets[0].data.map(d => d === 0 ? 0.01 : d) }] };

  return (
    <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
      <Text style={[styles.title, { color: colors.text }]}>Spending Trend ({budget.period})</Text>
      <LineChart
        data={dataToUse}
        width={width - 40 - 32} // padding adjustments (20 horizontal page padding + 16 chart container padding * 2?)
        height={180}
        yAxisLabel="₱"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          fillShadowGradientFromOpacity: 0.3,
          fillShadowGradientToOpacity: 0,
          useShadowColorFromDataset: true,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(${hexToRgb(budget.color || colors.primary)}, ${opacity})`,
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
  container: { borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 24 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 16, marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -16 },
});
