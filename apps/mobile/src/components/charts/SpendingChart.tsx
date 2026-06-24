import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import type { Transaction } from '@/types/transaction';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Props {
  transactions: Transaction[];
}

/**
 * Spending trend line chart for the last 7 days.
 */
export function SpendingChart({ transactions }: Props) {
  const colors = useThemeColors();
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyTotals = last7Days.map((day) =>
    transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(day))
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const labels = last7Days.map((d) => {
    const date = new Date(d);
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][date.getDay()];
  });

  return (
    <Animated.View entering={FadeInUp.delay(200).springify()} style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
      <Text style={[styles.title, { color: colors.text }]}>Spending — Last 7 Days</Text>
      <LineChart
        data={{ labels, datasets: [{ data: dailyTotals.length > 0 ? dailyTotals : [0] }] }}
        width={width - 40}
        height={180}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(160, 82, 230, ${opacity})`, // primary
          labelColor: () => colors.textMuted,
          propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
          propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4' },
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
  container: { borderRadius: 20, padding: 16, borderWidth: 1, marginTop: 12 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -16 },
});
