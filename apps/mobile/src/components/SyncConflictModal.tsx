import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { OriginDialog } from '@/components/ui/OriginDialog';

import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolveSyncChoice } from '@/services/syncService';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

export function SyncConflictModal() {
  const { syncConflict } = useAuthStore();
  const colors = useThemeColors();
  const [resolving, setResolving] = useState(false);

  const handleChoice = async (choice: 'local' | 'cloud') => {
    setResolving(true);
    await resolveSyncChoice(choice);
    setResolving(false);
  };

  return (
    <OriginDialog visible={syncConflict} onClose={() => {}} origin={null}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Ionicons name="cloud-offline" size={48} color={colors.primary} style={{ alignSelf: 'center', marginBottom: moderateScale(16) }} />
        <Text style={[styles.title, { color: colors.text }]}>Data Conflict Detected</Text>
        <Text style={[styles.message, { color: colors.textMuted }]}>
          You have local data on this device, but your account also contains existing cloud data. Please choose which data you want to keep.
        </Text>

        {resolving ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: moderateScale(24) }} />
        ) : (
          <View style={styles.buttonContainer}>
            <AnimatedPressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => handleChoice('local')}
            >
              <Text style={styles.buttonText}>Keep Local Data</Text>
              <Text style={[styles.subText, { color: 'rgba(255,255,255,0.7)' }]}>Overwrites cloud data</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[styles.button, { backgroundColor: colors.border }]}
              onPress={() => handleChoice('cloud')}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Use Cloud Data</Text>
              <Text style={[styles.subText, { color: colors.textMuted }]}>Discards local data</Text>
            </AnimatedPressable>
          </View>
        )}
      </View>
    </OriginDialog>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: moderateScale(24) },
  card: { padding: moderateScale(24), borderRadius: moderateScale(24), elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: verticalScale(2) }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  title: { fontFamily: 'Inter-Bold', fontSize: moderateScale(22), textAlign: 'center', marginBottom: moderateScale(12) },
  message: { fontFamily: 'Inter-Regular', fontSize: moderateScale(16), textAlign: 'center', marginBottom: moderateScale(24), lineHeight: 24 },
  buttonContainer: { gap: moderateScale(12) },
  button: { padding: moderateScale(16), borderRadius: moderateScale(12), alignItems: 'center' },
  buttonText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16), color: '#fff', marginBottom: moderateScale(4) },
  subText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(12) },
});
