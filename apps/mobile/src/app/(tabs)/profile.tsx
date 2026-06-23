import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/Colors';

/**
 * User profile & settings screen.
 */
export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

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
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
              <Ionicons name={item.icon as any} size={20} color={Colors.textMuted} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Chat shortcut */}
        <TouchableOpacity style={styles.aiCard} onPress={() => router.push('/ai/chat')}>
          <Ionicons name="sparkles" size={22} color={Colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.aiCardTitle}>Ask Nekofi AI</Text>
            <Text style={styles.aiCardSubtitle}>Get personalized financial insights</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.text, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  avatarSection: { alignItems: 'center', paddingBottom: 32, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-Bold', fontSize: 36, color: '#fff' },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 20, color: Colors.text },
  email: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textMuted },
  menu: { marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 14 },
  menuLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: Colors.text },
  aiCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, backgroundColor: Colors.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: Colors.primary + '40', marginBottom: 20 },
  aiCardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  aiCardSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textMuted },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, gap: 8, paddingVertical: 16, backgroundColor: '#FF6B6B20', borderRadius: 14, marginBottom: 40 },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#FF6B6B' },
});
