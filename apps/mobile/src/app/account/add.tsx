import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAccountStore } from '@/stores/accountStore';
import { AccountType, CreateAccountDto } from '@/types/account';
import { useThemeColors } from '@/hooks/useThemeColors';

const ACCOUNT_OPTIONS: { title: string, options: CreateAccountDto[] }[] = [
  {
    title: 'Banks',
    options: [
      { name: 'BDO Unibank', type: 'bank', brandIcon: 'business', color: '#002B7F', gradientEnd: '#0F1115', textColor: '#FFFFFF', numberMasked: '1234' },
      { name: 'BPI', type: 'bank', brandIcon: 'business', color: '#B00020', gradientEnd: '#0F1115', textColor: '#FFFFFF', numberMasked: '5678' },
      { name: 'UnionBank', type: 'bank', brandIcon: 'business', color: '#FF7F00', gradientEnd: '#0F1115', textColor: '#FFFFFF', numberMasked: '9012' },
    ]
  },
  {
    title: 'E-Wallets',
    options: [
      { name: 'GCash', type: 'wallet', brandIcon: 'wallet', color: '#0052C2', gradientEnd: '#0F1115', textColor: '#FFFFFF' },
      { name: 'Maya', type: 'wallet', brandIcon: 'wallet', color: '#000000', gradientEnd: '#0F1115', textColor: '#FFFFFF' },
      { name: 'GrabPay', type: 'wallet', brandIcon: 'wallet', color: '#00B14F', gradientEnd: '#0F1115', textColor: '#FFFFFF' },
    ]
  },
  {
    title: 'Cash',
    options: [
      { name: 'Cash', type: 'cash', brandIcon: 'cash', color: '#20A175', gradientEnd: '#0F1115', textColor: '#FFFFFF' },
    ]
  },
  {
    title: 'Others',
    options: [
      { name: 'Other Bank', type: 'bank', brandIcon: 'business-outline', color: '#4A5568', gradientEnd: '#0F1115', textColor: '#FFFFFF' },
      { name: 'Other E-Wallet', type: 'wallet', brandIcon: 'wallet-outline', color: '#4A5568', gradientEnd: '#0F1115', textColor: '#FFFFFF' },
    ]
  }
];

export default function AddAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { addAccount } = useAccountStore();

  const handleSelect = async (option: CreateAccountDto) => {
    // In a real app, this would route to a form to enter credentials/balances
    // For this redesign, we'll simulate adding it right away with some dummy balance
    await addAccount({
      ...option,
      balance: Math.floor(Math.random() * 50000) + 1000, 
    });
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Add Account</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Select the type of account you want to connect to Nekofi.
        </Text>

        {ACCOUNT_OPTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.cardGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {section.options.map((option, index) => (
                <View key={option.name}>
                  <Pressable 
                    style={styles.optionRow}
                    onPress={() => handleSelect(option)}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[styles.iconBox, { backgroundColor: option.color }]}>
                        <Ionicons name={option.brandIcon as any} size={20} color={option.textColor} />
                      </View>
                      <Text style={[styles.optionText, { color: colors.text }]}>{option.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </Pressable>
                  {index < section.options.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginLeft: -4 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 18 },
  scroll: { padding: 20, paddingBottom: 60 },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 15, marginBottom: 24, lineHeight: 22 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, marginBottom: 12 },
  cardGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: { fontFamily: 'Inter-Medium', fontSize: 15 },
  divider: { height: 1, marginLeft: 72 },
});
