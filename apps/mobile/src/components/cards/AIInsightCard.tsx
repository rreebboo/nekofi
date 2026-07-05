/**
 * AIInsightCard
 *
 * Compact card displayed on the Dashboard that shows a dynamic,
 * context-aware AI insight generated from the user's actual financial data.
 * Tapping it opens the full AI chat.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAIStore } from '@/store/useAIStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { moderateScale, verticalScale } from '@/utils/responsive';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AIInsightCard() {
  const colors = useThemeColors();
  const { latestInsight, insightLoading, isReady, isDownloading, downloadProgress, refreshInsight } = useAIStore();
  const scaleVal = useSharedValue(1);

  // Refresh insight when the card mounts and AI is ready
  useEffect(() => {
    if (isReady) {
      refreshInsight();
    }
  }, [isReady]);

  const handlePress = () => {
    router.push('/ai/chat');
  };

  const handleRefresh = () => {
    if (!insightLoading && isReady) {
      refreshInsight();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <AnimatedPressable
        style={[styles.card, { backgroundColor: colors.surface, borderColor: `${colors.primary}30`, shadowColor: '#000' }, animatedStyle]}
        onPress={handlePress}
        onPressIn={() => (scaleVal.value = withSpring(0.98))}
        onPressOut={() => (scaleVal.value = withSpring(1))}
      >
        <View style={styles.header}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <Text style={[styles.headerText, { color: colors.primary }]}>Nekofi AI Insight</Text>
          {isReady && (
            <Pressable onPress={handleRefresh} hitSlop={8}>
              {insightLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
              )}
            </Pressable>
          )}
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
        ) : insightLoading && !latestInsight ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.insight, { color: colors.textMuted }]}>
              Analyzing your finances...
            </Text>
          </View>
        ) : (
          <Text style={[styles.insight, { color: colors.text }]} numberOfLines={2}>
            {latestInsight || 'Tap to chat with your AI financial assistant 🐱'}
          </Text>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: moderateScale(16), padding: moderateScale(16), borderWidth: 1, shadowOffset: { width: 0, height: verticalScale(4) }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), marginBottom: moderateScale(10) },
  headerText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: moderateScale(13) },
  insight: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), lineHeight: 22 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(10), marginTop: moderateScale(8) },
});
