import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import type { Transaction } from '@/types/transaction';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

const { width } = Dimensions.get('window');

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '125, 168, 47';
};

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
        yAxisLabel="₱"
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
          labelColor: () => colors.textMuted,
          propsForDots: { r: '3' },
          propsForBackgroundLines: { stroke: colors.borderAlt || 'rgba(0,0,0,0.05)', strokeDasharray: '4' },
        }}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: moderateScale(20), padding: moderateScale(16), borderWidth: 1, marginTop: moderateScale(12) },
  title: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(14), marginBottom: moderateScale(12) },
  chart: { borderRadius: moderateScale(12), marginLeft: moderateScale(-16) },
});
