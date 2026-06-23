import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiClient } from '@/services/api/client';
import { Colors } from '@/constants/Colors';

/**
 * AI insight card — shown on dashboard, fetches a quick tip from Gemini.
 */
export function AIInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/ai/daily-insight');
        setInsight(res.data.insight);
      } catch {
        setInsight('Track your spending consistently to unlock AI-powered insights.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push('/ai/chat')} activeOpacity={0.8}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={Colors.primary} />
        <Text style={styles.headerText}>Nekofi AI Insight</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />
      ) : (
        <Text style={styles.insight}>{insight}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.primary + '40' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headerText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.primary },
  insight: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, lineHeight: 22 },
});
