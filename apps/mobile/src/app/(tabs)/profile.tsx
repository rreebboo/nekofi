import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

/**
 * User profile & settings screen.
 */
export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const colors = useThemeColors();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => router.push('/settings/edit-profile' as any) },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'color-palette-outline', label: 'Appearance', onPress: () => router.push('/settings/appearance' as any) },
    { icon: 'shield-checkmark-outline', label: 'Security', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'document-text-outline', label: 'Privacy Policy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {!user ? (
          <View style={styles.guestSection}>
            <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.borderAlt, borderWidth: 1 }]}>
              <Ionicons name="person-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.name, { color: colors.text, marginTop: moderateScale(12) }]}>Guest Mode</Text>
            <Text style={[styles.email, { color: colors.textMuted, textAlign: 'center', marginHorizontal: moderateScale(20), marginTop: moderateScale(4) }]}>
              You are currently using the app as a guest. Sign in to sync your data across devices.
            </Text>

            <View style={styles.guestActions}>
              <TouchableOpacity style={[styles.guestBtnPrimary, { backgroundColor: colors.primary }]} onPress={() => router.push('/(auth)/sign-up')}>
                <Text style={styles.guestBtnPrimaryText}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.guestBtnSecondary, { borderColor: colors.borderAlt, borderWidth: 1 }]} onPress={() => router.push('/(auth)/sign-in')}>
                <Text style={[styles.guestBtnSecondaryText, { color: colors.text }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: moderateScale(8) }} onPress={() => router.replace('/(tabs)')}>
                <Text style={[styles.guestBtnLink, { color: colors.textMuted }]}>Continue as Guest</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? 'User'}</Text>
              <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email ?? ''}</Text>
            </View>

            {/* Menu */}
            <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}>
              {menuItems.map((item, idx) => (
                <TouchableOpacity key={idx} style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={item.onPress}>
                  <Ionicons name={item.icon as any} size={20} color={colors.textMuted} />
                  <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            {/* AI Chat shortcut */}
            <TouchableOpacity style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]} onPress={() => router.push('/ai/chat')}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: moderateScale(12) }}>
                <Text style={[styles.aiCardTitle, { color: colors.text }]}>Ask Nekofi AI</Text>
                <Text style={[styles.aiCardSubtitle, { color: colors.textMuted }]}>Get personalized financial insights</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
        
        <View style={{ height: verticalScale(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: 'Inter-Bold', fontSize: moderateScale(28), paddingHorizontal: moderateScale(20), paddingTop: moderateScale(16), paddingBottom: moderateScale(20) },
  avatarSection: { alignItems: 'center', paddingBottom: moderateScale(32), gap: moderateScale(8) },
  avatar: { width: scale(80), height: verticalScale(80), borderRadius: moderateScale(40), alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-Bold', fontSize: moderateScale(36), color: '#fff' },
  name: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(20) },
  email: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), lineHeight: 22 },
  menu: { marginHorizontal: moderateScale(20), borderRadius: moderateScale(20), borderWidth: 1, overflow: 'hidden', marginBottom: moderateScale(20) },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(18), paddingVertical: moderateScale(16), borderBottomWidth: 1, gap: moderateScale(14) },
  menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: moderateScale(15) },
  aiCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: moderateScale(20), borderRadius: moderateScale(16), padding: moderateScale(18), borderWidth: 1, marginBottom: moderateScale(20) },
  aiCardTitle: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15) },
  aiCardSubtitle: { fontFamily: 'Inter-Regular', fontSize: moderateScale(12) },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: moderateScale(20), gap: moderateScale(8), paddingVertical: moderateScale(16), backgroundColor: '#FF6B6B20', borderRadius: moderateScale(16), marginBottom: moderateScale(40) },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(15), color: '#FF6B6B' },
  guestSection: { alignItems: 'center', paddingBottom: moderateScale(32), gap: moderateScale(8) },
  guestActions: { width: '100%', paddingHorizontal: moderateScale(20), marginTop: moderateScale(24), gap: moderateScale(12) },
  guestBtnPrimary: { borderRadius: moderateScale(16), paddingVertical: moderateScale(16), alignItems: 'center' },
  guestBtnPrimaryText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16), color: '#fff' },
  guestBtnSecondary: { borderRadius: moderateScale(16), paddingVertical: moderateScale(16), alignItems: 'center' },
  guestBtnSecondaryText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },
  guestBtnLink: { fontFamily: 'Inter-Medium', fontSize: moderateScale(14), textAlign: 'center', padding: moderateScale(8) },
});
