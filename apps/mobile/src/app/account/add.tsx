import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAccountStore } from '@/stores/accountStore';
import { AccountType, CreateAccountDto } from '@/types/account';
import { useThemeColors } from '@/hooks/useThemeColors';
import { brickService } from '@/services/brickService';

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
  const [selectedOption, setSelectedOption] = useState<CreateAccountDto | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleSelect = (option: CreateAccountDto) => {
    setSelectedOption(option);
  };

  const closePrompt = () => setSelectedOption(null);

  const handleConnect = async () => {
    if (!selectedOption || connecting) return;

    setConnecting(true);
    try {
      // Get a public token from Brick via our Edge Function
      const { publicToken, redirectUrl } = await brickService.getPublicToken(selectedOption.name);

      closePrompt();

      // Navigate to the WebView connect screen with the token
      router.push({
        pathname: '/account/connect',
        params: {
          publicToken,
          redirectUrl,
          name: selectedOption.name,
          type: selectedOption.type,
          brandIcon: selectedOption.brandIcon,
          color: selectedOption.color,
          textColor: selectedOption.textColor,
        },
      });
    } catch (err: any) {
      console.error('Failed to start connection:', err);
      Alert.alert(
        'Connection Error',
        err.message || 'Failed to start the connection. Please try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleManualAdd = () => {
    closePrompt();
    if (selectedOption) {
      router.push({
        pathname: '/account/setup',
        params: {
          name: selectedOption.name,
          type: selectedOption.type,
          brandIcon: selectedOption.brandIcon,
          color: selectedOption.color,
          textColor: selectedOption.textColor,
        },
      });
    }
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

      {/* Custom Bottom Sheet Prompt */}
      <Modal
        visible={!!selectedOption}
        transparent
        animationType="fade"
        onRequestClose={closePrompt}
      >
        <Pressable style={styles.modalOverlay} onPress={closePrompt}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            {selectedOption && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: selectedOption.color }]}>
                    <Ionicons name={selectedOption.brandIcon as any} size={28} color={selectedOption.textColor} />
                  </View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Add {selectedOption.name}</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    Nekofi will securely connect to read your balance and transactions automatically.
                  </Text>
                </View>

                <View style={styles.modalFeatures}>
                  <View style={styles.featureRow}>
                    <Ionicons name="wallet-outline" size={24} color={colors.text} />
                    <Text style={[styles.featureText, { color: colors.text }]}>Read your account balance</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="list-outline" size={24} color={colors.text} />
                    <Text style={[styles.featureText, { color: colors.text }]}>Sync recent transactions</Text>
                  </View>
                  <View style={styles.featureRow}>
                    <Ionicons name="lock-closed-outline" size={24} color={colors.text} />
                    <Text style={[styles.featureText, { color: colors.text }]}>Bank-grade security</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable 
                    style={[styles.connectButton, { backgroundColor: selectedOption.color, opacity: connecting ? 0.7 : 1 }]} 
                    onPress={handleConnect}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <View style={styles.connectButtonLoading}>
                        <ActivityIndicator size="small" color={selectedOption.textColor} />
                        <Text style={[styles.connectButtonText, { color: selectedOption.textColor, marginLeft: 8 }]}>
                          Connecting...
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.connectButtonText, { color: selectedOption.textColor }]}>
                        Connect {selectedOption.name}
                      </Text>
                    )}
                  </Pressable>

                  <Pressable 
                    style={styles.manualButton} 
                    onPress={handleManualAdd}
                  >
                    <Text style={[styles.manualButtonText, { color: colors.text }]}>
                      Add manually instead
                    </Text>
                  </Pressable>
                </View>

                <Pressable style={styles.cancelButton} onPress={closePrompt}>
                  <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 22,
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
    gap: 16,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
  modalActions: {
    marginBottom: 16,
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
  connectButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  manualButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
});
