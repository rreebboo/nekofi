import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';

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
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'card-outline', label: 'Payment Methods', onPress: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Security', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'document-text-outline', label: 'Privacy Policy', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
          </View>
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
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.aiCardTitle, { color: colors.text }]}>Ask Nekofi AI</Text>
            <Text style={[styles.aiCardSubtitle, { color: colors.textMuted }]}>Get personalized financial insights</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  avatarSection: { alignItems: 'center', paddingBottom: 32, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-Bold', fontSize: 36, color: '#fff' },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 20 },
  email: { fontFamily: 'Inter-Regular', fontSize: 14 },
  menu: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, gap: 14 },
  menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15 },
  aiCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
  aiCardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
  aiCardSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, gap: 8, paddingVertical: 16, backgroundColor: '#FF6B6B20', borderRadius: 16, marginBottom: 40 },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FF6B6B' },
});
