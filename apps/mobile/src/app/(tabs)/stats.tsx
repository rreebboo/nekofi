import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTransactionStore } from '@/stores/transactionStore';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useFabScroll } from '@/contexts/FabContext';

const screenWidth = Dimensions.get('window').width;

const categoryColors: Record<string, string> = {
  Food: '#FF6B6B',
  Transport: '#4ECDC4',
  Shopping: '#45B7D1',
  Entertainment: '#F9CA24',
  Bills: '#6C5CE7',
  Health: '#FD79A8',
  Other: '#A4B0BE',
  Salary: '#20BF6B',
  Gift: '#0FB9B1',
  Investment: '#F7B731',
};

function getConsistentColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 60%)`;
}

export default function StatsScreen() {
  const colors = useThemeColors();
  const { transactions } = useTransactionStore();
  const [filterType, setFilterType] = useState<'expense' | 'income'>('expense');
  const scrollHandler = useFabScroll();

  // Filter transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter(t => t.type === filterType);
  }, [transactions, filterType]);

  // Aggregate by category for Pie Chart
  const pieChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredTxs.forEach(t => {
      const cat = t.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    return Object.keys(categoryTotals).map((cat) => ({
      name: cat,
      amount: categoryTotals[cat],
      color: categoryColors[cat] || getConsistentColor(cat),
      legendFontColor: colors.text,
      legendFontSize: 12,
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredTxs, colors.text]);

  // Aggregate by last 7 days for Line Chart
  const lineChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const dailyTotals: Record<string, number> = {};
    last7Days.forEach(d => dailyTotals[d] = 0);

    filteredTxs.forEach(t => {
      const dateStr = new Date(t.date).toISOString().split('T')[0];
      if (dailyTotals[dateStr] !== undefined) {
        dailyTotals[dateStr] += t.amount;
      }
    });

    return {
      labels: last7Days.map(d => d.substring(5, 10)), // MM-DD
      datasets: [
        {
          data: last7Days.map(d => dailyTotals[d] || 0),
          color: (opacity = 1) => filterType === 'expense' ? `rgba(255, 107, 107, ${opacity})` : `rgba(32, 191, 107, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: [filterType === 'expense' ? 'Expenses (Last 7 days)' : 'Income (Last 7 days)']
    };
  }, [filteredTxs, filterType]);

  const totalAmount = useMemo(() => filteredTxs.reduce((sum, t) => sum + t.amount, 0), [filteredTxs]);

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => colors.text,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForLabels: {
      fontFamily: 'Inter-Medium',
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Statistics</Text>
      </View>

      <View style={[styles.typePicker, { backgroundColor: colors.surface }]}>
        {(['expense', 'income'] as const).map((t) => (
          <AnimatedPressable
            key={t}
            style={[styles.typeBtn, filterType === t && { backgroundColor: colors.primary }]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[styles.typeBtnText, { color: colors.textMuted }, filterType === t && styles.typeBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Total {filterType === 'expense' ? 'Expenses' : 'Income'}
          </Text>
          <Text style={[styles.totalText, { color: filterType === 'expense' ? '#FF6B6B' : '#20BF6B' }]}>
            ${totalAmount.toFixed(2)}
          </Text>
        </View>

        {pieChartData.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Category Breakdown</Text>
            <View style={styles.pieChart3dContainer}>
              <PieChart
                data={pieChartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                accessor={"amount"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                absolute
              />
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No data for category breakdown</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface, marginBottom: 120 }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Last 7 Days</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  typePicker: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  typeBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  totalText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    marginVertical: 10,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  pieChart3dContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
