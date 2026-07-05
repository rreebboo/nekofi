import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/services/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';


export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user, updateUser } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFullName(data.name || user.name || '');
          setUsername(data.username || '');
          setPhone(data.phone || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || user.avatarUrl || null);
        } else {
          setFullName(user.name || '');
          setAvatarUrl(user.avatarUrl || null);
        }
      } catch (err: any) {
        Alert.alert('Error', 'Failed to load profile details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access library is required to change profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      setSaving(true);

      const fileExt = imageUri.split('.').pop() || 'jpg';
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'An error occurred while uploading your photo.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    if (bio.length > 200) {
      Alert.alert('Validation Error', 'Bio cannot exceed 200 characters.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update public.profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user!.id,
          name: fullName.trim(),
          username: username.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 2. Update auth.users metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          avatar_url: avatarUrl,
        },
      });

      if (authError) throw authError;

      // 3. Update local Zustand state
      updateUser({
        name: fullName.trim(),
        avatarUrl: avatarUrl || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'An error occurred while saving changes.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surface }]} onPress={() => router.back()} disabled={saving}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarContainer, { borderColor: colors.borderAlt }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarFallbackText}>
                    {(fullName || user?.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {saving && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.changePhotoButton, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}
              onPress={handlePickAvatar}
              disabled={saving}
            >
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Email Address (Read-only)</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.inputDisabled,
                  { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.textMuted },
                ]}
                value={user?.email || ''}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
                maxLength={50}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                maxLength={30}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={20}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Bio / About</Text>
                <Text style={[styles.charCount, { color: colors.textMuted }]}>{bio.length}/200</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text },
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                maxLength={200}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: colors.borderAlt }]}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View style={{ height: verticalScale(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: moderateScale(24),
  },
  closeButton: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: moderateScale(20),
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: moderateScale(24),
    gap: moderateScale(12),
  },
  avatarContainer: {
    width: scale(100),
    height: verticalScale(100),
    borderRadius: moderateScale(50),
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontFamily: 'Inter-Bold',
    fontSize: moderateScale(42),
    color: '#fff',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    gap: moderateScale(6),
  },
  changePhotoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: moderateScale(13),
  },
  form: {
    gap: moderateScale(20),
  },
  inputGroup: {
    gap: moderateScale(8),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: moderateScale(13),
  },
  charCount: {
    fontFamily: 'Inter-Regular',
    fontSize: moderateScale(11),
  },
  input: {
    borderRadius: moderateScale(14),
    paddingHorizontal: moderateScale(18),
    paddingVertical: moderateScale(14),
    fontFamily: 'Inter-Regular',
    fontSize: moderateScale(15),
    borderWidth: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  textArea: {
    height: verticalScale(90),
    paddingTop: moderateScale(14),
    paddingBottom: moderateScale(14),
  },
  actions: {
    marginTop: moderateScale(32),
    gap: moderateScale(12),
  },
  btn: {
    borderRadius: moderateScale(16),
    paddingVertical: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtn: {},
  saveBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: moderateScale(16),
    color: '#fff',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: moderateScale(16),
  },
});
