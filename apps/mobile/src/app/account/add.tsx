import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CreateAccountDto } from '@/types/account';
import { useThemeColors } from '@/hooks/useThemeColors';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInDown, FadeOut, SlideOutDown } from 'react-native-reanimated';
import { OriginBottomSheet, OriginCoordinate } from '@/components/ui/OriginBottomSheet';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

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
  const [selectedOption, setSelectedOption] = useState<CreateAccountDto | null>(null);
  const [origin, setOrigin] = useState<OriginCoordinate | null>(null);

  const handleSelect = (option: CreateAccountDto, e?: any) => {
    if (e && e.nativeEvent) {
      setOrigin({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY });
    }
    if (option.type === 'cash') {
      router.push({
        pathname: '/account/setup',
        params: {
          name: option.name,
          type: option.type,
          brandIcon: option.brandIcon,
          color: option.color,
          textColor: option.textColor,
        },
      });
      return;
    }
    setSelectedOption(option);
  };

  const closePrompt = () => {
    setSelectedOption(null);
  };

  const handleConnect = () => {
    if (!selectedOption) return;

    const option = selectedOption;
    closePrompt();

    // Small delay to let the modal close animation finish
    setTimeout(() => {
      router.push({
        pathname: '/account/connect',
        params: {
          name: option.name,
          type: option.type,
          brandIcon: option.brandIcon,
          color: option.color,
          textColor: option.textColor,
        },
      });
    }, 250);
  };

  const handleManualAdd = () => {
    if (!selectedOption) return;
    const option = selectedOption;
    closePrompt();
    
    setTimeout(() => {
      router.push({
        pathname: '/account/setup',
        params: {
          name: option.name,
          type: option.type,
          brandIcon: option.brandIcon,
          color: option.color,
          textColor: option.textColor,
        },
      });
    }, 250);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Add Account</Text>
        <View style={{ width: scale(24) }} />
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
                    style={({ pressed }) => [
                      styles.optionRow,
                      pressed && { backgroundColor: colors.surfaceAlt }
                    ]}
                    onPress={(e) => handleSelect(option, e)}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[styles.iconBox, { backgroundColor: option.color }]}>
                        <Ionicons name={option.brandIcon as any} size={20} color={option.textColor} />
                      </View>
                      <Text style={[styles.optionText, { color: colors.text }]}>{option.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
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

      {/* Premium Bottom Sheet Prompt */}
      <OriginBottomSheet visible={!!selectedOption} onClose={closePrompt} origin={origin}>
        {selectedOption && (
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.borderAlt, borderWidth: 1 }]}>
            <View style={styles.modalDragIndicator} />
            
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: selectedOption.color, shadowColor: selectedOption.color }]}>
                <Ionicons name={selectedOption.brandIcon as any} size={32} color={selectedOption.textColor} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add {selectedOption.name}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Connect securely to sync your balance and latest transactions automatically.
              </Text>
            </View>

            <View style={styles.modalFeatures}>
              <View style={[styles.featureRow, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Live account balance</Text>
              </View>
              <View style={[styles.featureRow, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name="list-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Automatic transaction sync</Text>
              </View>
              <View style={[styles.featureRow, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.featureIconWrap, { backgroundColor: colors.surface }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Bank-grade encryption</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable 
                style={({ pressed }) => [
                  styles.connectButton, 
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.8 }
                ]} 
                onPress={handleConnect}
              >
                <Text style={[styles.connectButtonText, { color: '#FFF' }]}>
                  Connect Account
                </Text>
              </Pressable>

              <Pressable 
                style={({ pressed }) => [
                  styles.manualButton,
                  pressed && { backgroundColor: colors.surfaceAlt }
                ]} 
                onPress={handleManualAdd}
              >
                <Text style={[styles.manualButtonText, { color: colors.text }]}>
                  Add manually instead
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </OriginBottomSheet>
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
  subtitle: { fontFamily: 'Inter-Regular', fontSize: moderateScale(15), marginBottom: moderateScale(24), lineHeight: 22 },
  section: { marginBottom: moderateScale(24) },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16), marginBottom: moderateScale(12) },
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
  optionText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(15) },
  divider: { height: 1, marginLeft: moderateScale(72) },
  
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
    opacity: 0.5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  modalIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  modalFeatures: {
    gap: 12,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 16,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
  modalActions: {
    gap: 12,
  },
  connectButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  connectButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  manualButton: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  manualButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
});
