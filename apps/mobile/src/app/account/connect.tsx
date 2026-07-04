import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAccountStore } from '@/stores/accountStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, ZoomIn } from 'react-native-reanimated';

type ConnectState = 'permission' | 'login' | 'connecting' | 'success';

export default function ConnectAccountScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const params = useLocalSearchParams();
  const { addAccount } = useAccountStore();

  const name = params.name as string;
  const type = params.type as string;
  const brandIcon = params.brandIcon as string;
  const providerColor = (params.color as string) || colors.primary;
  const textColor = (params.textColor as string) || '#FFFFFF';

  const [state, setState] = useState<ConnectState>('permission');
  const [loadingText, setLoadingText] = useState('Establishing secure connection...');
  
  // Form fields for mock login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAllowPermission = () => {
    setState('login');
  };

  const handleLogin = () => {
    if (!username || !password) return; // Basic validation
    setState('connecting');
    
    // Simulate loading states
    setTimeout(() => setLoadingText('Verifying credentials...'), 1500);
    setTimeout(() => setLoadingText('Retrieving account data...'), 3000);
    setTimeout(() => setLoadingText('Finalizing secure sync...'), 4500);
    
    setTimeout(() => {
      // Generate realistic mock data
      const randomBalance = Math.floor(Math.random() * 50000) + 1000; // Between 1,000 and 51,000
      const randomMasked = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit string
      
      addAccount({
        name,
        type: type as any,
        brandIcon: brandIcon as any,
        color: providerColor,
        gradientEnd: '#0F1115',
        textColor,
      });

      // Instead of waiting for bankService, we immediately update the just-created account in the store.
      // We know it was just added to the end of the array.
      useAccountStore.setState((s) => {
        const newlyAdded = [...s.accounts].pop();
        if (newlyAdded) {
          const updatedAccounts = s.accounts.map(acc => 
            acc.id === newlyAdded.id 
              ? {
                  ...acc,
                  balance: randomBalance,
                  numberMasked: randomMasked,
                  isLinked: true,
                  syncStatus: 'synced' as const,
                  linkedAccountId: `mock-id-${Date.now()}`
                }
              : acc
          );
          return { accounts: updatedAccounts };
        }
        return s;
      });
      
      setState('success');
      
      // Auto redirect back to cards after success animation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 2500);
    }, 6000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Dynamic Header based on state */}
      <View style={[styles.header, { borderBottomColor: colors.borderAlt }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>
          {state === 'permission' ? 'Secure Connection' : state === 'login' ? `Sign in to ${name}` : 'Connecting...'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* STEP 1: PERMISSION REQUEST */}
          {state === 'permission' && (
            <Animated.View entering={FadeIn} exiting={SlideOutLeft} style={styles.stepContainer}>
              <View style={styles.connectionGraphic}>
                <View style={[styles.appIconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="wallet" size={32} color={colors.primary} />
                </View>
                
                <View style={styles.connectionLine}>
                  <View style={[styles.animatedDot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.animatedDot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.animatedDot, { backgroundColor: colors.primary }]} />
                </View>
                
                <View style={[styles.providerIconContainer, { backgroundColor: providerColor }]}>
                  <Ionicons name={brandIcon as any} size={32} color={textColor} />
                </View>
              </View>

              <Text style={[styles.headingText, { color: colors.text }]}>Nekofi wants to connect to {name}</Text>
              
              <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                By tapping Allow, you agree to share your data to enable automatic syncing.
              </Text>

              <View style={[styles.permissionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  <View style={styles.permissionTextContainer}>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Account details</Text>
                    <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>Read your account balance and type</Text>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.borderAlt }]} />
                <View style={styles.permissionItem}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  <View style={styles.permissionTextContainer}>
                    <Text style={[styles.permissionTitle, { color: colors.text }]}>Transaction history</Text>
                    <Text style={[styles.permissionDesc, { color: colors.textMuted }]}>Read up to 12 months of transaction history</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.securityNote, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                <Text style={[styles.securityText, { color: colors.textMuted }]}>
                  Nekofi will never see or store your login credentials. Your data is encrypted and securely transmitted.
                </Text>
              </View>

              <View style={styles.actionContainer}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.primaryButton, 
                    { backgroundColor: colors.primary },
                    pressed && { opacity: 0.8 }
                  ]}
                  onPress={handleAllowPermission}
                >
                  <Text style={[styles.primaryButtonText, { color: '#FFF' }]}>Allow Connection</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
                  <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>Deny</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* STEP 2: MOCKED PROVIDER LOGIN */}
          {state === 'login' && (
            <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.stepContainer}>
              <View style={[styles.providerHeader, { backgroundColor: providerColor }]}>
                <Ionicons name={brandIcon as any} size={48} color={textColor} />
                <Text style={[styles.providerName, { color: textColor }]}>{name} Portal</Text>
                <Text style={[styles.providerSub, { color: textColor, opacity: 0.8 }]}>Secure OAuth Login</Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Username / Phone Number</Text>
                  <TextInput 
                    style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Enter your ID"
                    placeholderTextColor={colors.textMuted}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
                  <TextInput 
                    style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <Pressable 
                  style={({ pressed }) => [
                    styles.primaryButton, 
                    { backgroundColor: providerColor },
                    pressed && { opacity: 0.8 },
                    (!username || !password) && { opacity: 0.5 }
                  ]}
                  onPress={handleLogin}
                  disabled={!username || !password}
                >
                  <Text style={[styles.primaryButtonText, { color: textColor }]}>Sign In</Text>
                </Pressable>

              </View>
            </Animated.View>
          )}

          {/* STEP 3: LOADING/CONNECTING */}
          {state === 'connecting' && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.loadingContainer}>
              <View style={styles.radarContainer}>
                <View style={[styles.radarCircle1, { borderColor: colors.primary }]} />
                <View style={[styles.radarCircle2, { borderColor: colors.primary }]} />
                <View style={[styles.radarCircle3, { borderColor: colors.primary }]} />
                
                <View style={[styles.centerLoadingIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons name="lock-closed" size={32} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.loadingHeading, { color: colors.text }]}>Securing Connection</Text>
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>{loadingText}</Text>
              
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceAlt }]}>
                <Animated.View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: loadingText === 'Establishing secure connection...' ? '25%' : loadingText === 'Verifying credentials...' ? '50%' : loadingText === 'Retrieving account data...' ? '75%' : '95%' }]} />
              </View>
            </Animated.View>
          )}

          {/* STEP 4: SUCCESS */}
          {state === 'success' && (
            <Animated.View entering={ZoomIn} style={styles.successContainer}>
              <View style={[styles.successIconWrapper, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
              </View>
              
              <Text style={[styles.successTitle, { color: colors.text }]}>Successfully Connected</Text>
              <Text style={[styles.successDesc, { color: colors.textMuted }]}>
                Your {name} account is now linked. You're being redirected to your cards...
              </Text>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    padding: 24,
    flex: 1,
  },
  
  /* Permission Request Styles */
  connectionGraphic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 32,
  },
  appIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  providerIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  connectionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    gap: 8,
  },
  animatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.5,
  },
  headingText: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  disclaimerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    marginBottom: 2,
  },
  permissionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 16,
    marginLeft: 40,
  },
  securityNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  securityText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  actionContainer: {
    marginTop: 'auto',
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },

  /* Login Styles */
  providerHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginHorizontal: -24,
    marginTop: -24,
    marginBottom: 32,
  },
  providerName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginTop: 12,
  },
  providerSub: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginTop: 4,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginLeft: 4,
  },
  textInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },

  /* Loading Styles */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  radarContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  radarCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    opacity: 0.1,
  },
  radarCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    opacity: 0.3,
  },
  radarCircle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    opacity: 0.6,
  },
  centerLoadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingHeading: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    marginBottom: 12,
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    marginBottom: 32,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  /* Success Styles */
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  successDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
