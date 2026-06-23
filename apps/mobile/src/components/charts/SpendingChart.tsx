import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import type { Transaction } from '@/types/transaction';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface Props {
  transactions: Transaction[];
}

/**
 * Spending trend line chart for the last 7 days.
 */
export function SpendingChart({ transactions }: Props) {
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
    <View style={styles.container}>
      <Text style={styles.title}>Spending — Last 7 Days</Text>
      <LineChart
        data={{ labels, datasets: [{ data: dailyTotals.length > 0 ? dailyTotals : [0] }] }}
        width={width - 40}
        height={180}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(124, 107, 255, ${opacity})`,
          labelColor: () => Colors.textMuted,
          propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.primary },
          propsForBackgroundLines: { stroke: Colors.border, strokeDasharray: '4' },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: Colors.border },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginBottom: 12 },
  chart: { borderRadius: 12, marginLeft: -16 },
});
