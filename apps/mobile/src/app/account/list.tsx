import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAccountStore } from '@/stores/accountStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatCurrency } from '@/utils/formatters';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

export default function AccountListScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { accounts, removeAccount } = useAccountStore();

  const handleRemove = (id: string, name: string) => {
    Alert.alert(
      "Remove Account",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            removeAccount(id);
          } 
        }
      ]
    );
  };

  const renderRightActions = (acc: any) => {
    return (
      <AnimatedPressable 
        style={[styles.deleteAction, { backgroundColor: colors.expense }]} 
        onPress={() => handleRemove(acc.id, acc.name)}
      >
        <Ionicons name="trash" size={24} color="#FFF" />
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: colors.text }]}>All Accounts</Text>
        <View style={{ width: scale(24) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {accounts.length > 0 ? (
          <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {accounts.map((acc, index) => (
              <View key={acc.id}>
                <Swipeable renderRightActions={() => renderRightActions(acc)} overshootRight={false}>
                  <View style={[styles.optionRow, { backgroundColor: colors.surface }]}>
                    <View style={styles.optionLeft}>
                      <View style={[styles.iconBox, { backgroundColor: acc.color }]}>
                        <Ionicons name={acc.brandIcon as any} size={20} color={acc.textColor} />
                      </View>
                      <View>
                        <Text style={[styles.optionText, { color: colors.text }]}>{acc.name}</Text>
                        <Text style={[styles.accountType, { color: colors.textMuted }]}>
                          {acc.type.charAt(0).toUpperCase() + acc.type.slice(1)} {acc.numberMasked ? `• ${acc.numberMasked}` : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.optionRight}>
                      <Text style={[styles.balance, { color: colors.text }]}>{formatCurrency(acc.balance, 'PHP')}</Text>
                    </View>
                  </View>
                </Swipeable>
                {index < accounts.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="card-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No accounts linked</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Add a card or wallet to track balances</Text>
            
            <AnimatedPressable 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/account/add')}
            >
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addButtonText}>Add Account</Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
    borderBottomWidth: 1,
  },
  backButton: { padding: moderateScale(4), marginLeft: moderateScale(-4) },
  title: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(18) },
  scroll: { padding: moderateScale(20), paddingBottom: moderateScale(60) },
  cardGroup: {
    borderRadius: moderateScale(20),
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(16),
  },
  iconBox: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15), marginBottom: moderateScale(2) },
  accountType: { fontFamily: 'Inter-Regular', fontSize: moderateScale(12) },
  optionRight: { alignItems: 'flex-end', justifyContent: 'center', gap: moderateScale(4) },
  balance: { fontFamily: 'Inter-Bold', fontSize: moderateScale(15) },
  divider: { height: 1, marginLeft: moderateScale(72) },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: scale(80),
    height: '100%',
  },
  emptyState: {
    marginVertical: moderateScale(16),
    borderRadius: moderateScale(24),
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(24),
    minHeight: verticalScale(200),
  },
  emptyIconWrapper: {
    width: scale(64),
    height: verticalScale(64),
    borderRadius: moderateScale(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16), marginBottom: moderateScale(8) },
  emptySub: { fontFamily: 'Inter-Regular', fontSize: moderateScale(13), textAlign: 'center', marginBottom: moderateScale(20) },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(20),
    gap: moderateScale(8),
  },
  addButtonText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(14), color: '#FFF' },
});
