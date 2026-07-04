import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAccountStore } from '@/stores/accountStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CreateAccountDto } from '@/types/account';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

export default function SetupAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const { addAccount } = useAccountStore();
  
  const [balanceStr, setBalanceStr] = useState('');
  const [customName, setCustomName] = useState('');

  // Extract params passed from add.tsx
  const name = params.name as string;
  const type = params.type as any;
  const brandIcon = params.brandIcon as keyof typeof Ionicons.glyphMap;
  const color = params.color as string;
  const textColor = params.textColor as string;

  const handleSave = async () => {
    const balance = parseFloat(balanceStr) || 0;
    const finalName = name.startsWith('Other') ? (customName.trim() || name) : name;
    
    const option: CreateAccountDto = {
      name: finalName,
      type,
      brandIcon,
      color,
      gradientEnd: '#0F1115',
      textColor: textColor || '#FFFFFF',
    };

    await addAccount({
      ...option,
      balance,
    });
    
    // Go back to the main tabs, removing the add flow from the stack
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: colors.text }]}>Add {name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* The Manual Tracking Indicator */}
        <View style={[styles.indicatorBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <View style={styles.indicatorTextContainer}>
            <Text style={[styles.indicatorTitle, { color: colors.primary }]}>Manual Tracking</Text>
            <Text style={[styles.indicatorDesc, { color: colors.text }]}>
              Nekofi will not automatically read transactions for this account. You will need to log your income and expenses manually.
            </Text>
          </View>
        </View>

        {/* Optional Custom Name if 'Other' */}
        {name.startsWith('Other') && (
          <View style={[styles.inputSection, { marginBottom: 24 }]}>
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Account Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 14 }]}>
              <TextInput
                style={[styles.input, { color: colors.text, fontSize: 18, fontFamily: 'Inter-Medium' }]}
                placeholder={`Custom name (optional)`}
                placeholderTextColor={colors.textMuted}
                value={customName}
                onChangeText={setCustomName}
              />
            </View>
          </View>
        )}

        {/* User Input for Balance */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Current Balance</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>₱</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={balanceStr}
              onChangeText={setBalanceStr}
              autoFocus
            />
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <AnimatedPressable 
          style={[styles.saveButton, { backgroundColor: color || colors.primary, opacity: balanceStr ? 1 : 0.5 }]} 
          onPress={handleSave}
          disabled={!balanceStr}
        >
          <Text style={[styles.saveButtonText, { color: textColor || '#FFF' }]}>Save Account</Text>
        </AnimatedPressable>
      </View>
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
  content: { padding: 20, flex: 1 },
  
  indicatorBanner: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 32,
  },
  indicatorTextContainer: { flex: 1 },
  indicatorTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, marginBottom: 4 },
  indicatorDesc: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },

  inputSection: { marginBottom: 32 },
  inputLabel: { fontFamily: 'Inter-Medium', fontSize: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  currencySymbol: { fontFamily: 'Inter-Bold', fontSize: 32, marginRight: 8 },
  input: { flex: 1, fontFamily: 'Inter-Bold', fontSize: 32 },

  saveButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 16 },
});
