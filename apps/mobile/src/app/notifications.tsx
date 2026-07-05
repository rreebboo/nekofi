import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useNotificationStore } from '@/stores/notificationStore';
import { formatRelativeTime } from '@/utils/formatters';
import type { Notification, NotificationType } from '@/types/notification';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type FilterType = 'all' | 'unread' | 'alerts';

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { notifications, loading, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, clearNotifications } = useNotificationStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllAsRead();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // Clear local notifications
            clearNotifications();
          },
        },
      ]
    );
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === 'unread') return !item.isRead;
      if (filter === 'alerts') {
        return item.type === 'budget' || (item.type === 'expense' && item.metadata?.triggerType === 'large_expense');
      }
      return true;
    });
  }, [notifications, filter]);

  const getNotificationIconInfo = (type: NotificationType, title: string) => {
    switch (type) {
      case 'budget':
        if (title.toLowerCase().includes('exceeded') || title.toLowerCase().includes('🚨')) {
          return { name: 'alert-circle', color: colors.error, bg: colors.error + '15' };
        }
        return { name: 'cash-outline', color: colors.warning, bg: colors.warning + '15' };
      case 'expense':
        if (title.toLowerCase().includes('large') || title.toLowerCase().includes('⚠️')) {
          return { name: 'warning-outline', color: colors.warning, bg: colors.warning + '15' };
        }
        return { name: 'arrow-down-circle-outline', color: colors.expense, bg: colors.expense + '15' };
      case 'income':
        return { name: 'arrow-up-circle-outline', color: colors.income, bg: colors.income + '15' };
      case 'goal':
        return { name: 'trophy-outline', color: colors.secondary, bg: colors.secondary + '15' };
      case 'account':
        if (title.toLowerCase().includes('welcome') || title.toLowerCase().includes('🐱')) {
          return { name: 'sparkles-outline', color: colors.primary, bg: colors.primary + '15' };
        }
        return { name: 'shield-checkmark-outline', color: colors.info, bg: colors.info + '15' };
      case 'reminder':
        return { name: 'time-outline', color: colors.textMuted, bg: colors.borderAlt };
      case 'general':
      default:
        return { name: 'megaphone-outline', color: colors.primary, bg: colors.primary + '15' };
    }
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => {
    const iconInfo = getNotificationIconInfo(item.type, item.title);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 40).springify()}
        layout={Layout.springify()}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: item.isRead ? colors.borderAlt : colors.border,
            borderLeftColor: item.isRead ? colors.borderAlt : colors.primary,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!item.isRead) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              markAsRead(item.id);
            }
          }}
          style={styles.cardContent}
        >
          {/* Left Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconInfo.bg }]}>
            <Ionicons name={iconInfo.name as any} size={22} color={iconInfo.color} />
          </View>

          {/* Middle Body */}
          <View style={styles.textContainer}>
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.text, fontFamily: item.isRead ? 'Inter-Medium' : 'Inter-SemiBold' },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.cardBody, { color: colors.textMuted }]} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={[styles.cardTime, { color: colors.textDim }]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right Actions */}
        <View style={styles.actionColumn}>
          {!item.isRead && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                markAsRead(item.id);
              }}
              style={styles.actionBtn}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              deleteNotification(item.id);
            }}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notification Center</Text>
        <View style={styles.headerRight}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerActionBtn}>
                <Ionicons name="mail-open-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} style={styles.headerActionBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { borderColor: colors.border }]}>
        {(['all', 'unread', 'alerts'] as FilterType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(tab);
            }}
            style={[
              styles.tab,
              filter === tab && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 3,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: filter === tab ? colors.text : colors.textMuted,
                  fontFamily: filter === tab ? 'Inter-SemiBold' : 'Inter-Medium',
                },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textDim} />
          <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>
            No notifications
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted, marginTop: 8 }]}>
            You are all caught up! 🐱
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  title: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 14,
  },
  list: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    flex: 1,
    marginRight: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardTime: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  actionColumn: {
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f010',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    paddingVertical: 10,
    gap: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
