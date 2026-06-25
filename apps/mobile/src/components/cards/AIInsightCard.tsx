import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { aiService } from '@/services/ai/LocalAIService';
import { useAIStore } from '@/store/useAIStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * AI insight card — shown on dashboard, fetches a quick tip from local LLM.
 */
export function AIInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Connect to global AI state
  const { isDownloading, downloadProgress, isReady } = useAIStore();
  
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  useEffect(() => {
    (async () => {
      try {
        // This will trigger the download if not already downloaded
        const res = await aiService.generateInsight();
        setInsight(res);
      } catch {
        setInsight('Track your spending consistently to unlock AI-powered insights.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <AnimatedPressable 
        style={[styles.card, { backgroundColor: colors.surface, borderColor: `${colors.primary}30`, shadowColor: '#000' }, animatedStyle]} 
        onPress={() => router.push('/ai/chat')} 
        onPressIn={() => (scale.value = withSpring(0.98))}
        onPressOut={() => (scale.value = withSpring(1))}
      >
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.primary }]}>Nekofi AI Insight</Text>
          {isReady && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
          <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
        </View>

        {isDownloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.insight, { color: colors.text }]}>
              Downloading AI Model ({(downloadProgress * 100).toFixed(0)}%)
            </Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
        ) : (
          <Text style={[styles.insight, { color: colors.text }]}>{insight}</Text>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  headerText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13 },
  insight: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 22 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
});
