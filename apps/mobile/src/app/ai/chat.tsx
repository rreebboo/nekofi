import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { aiService } from '@/services/ai/LocalAIService';
import { useAIStore } from '@/store/useAIStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * AI Chat screen — streams responses from Local LLM.
 */
export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Nekofi AI! I can help you analyze your spending, suggest savings tips, and answer any financial questions. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const colors = useThemeColors();
  
  // Local AI State
  const { isDownloading, downloadProgress, isReady } = useAIStore();

  const sendMessage = async () => {
    if (!input.trim() || loading || !isReady) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await aiService.chat(userMsg.content);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I had trouble processing that locally.', timestamp: new Date() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <Animated.View entering={FadeInDown.springify()} style={[styles.bubble, item.role === 'user' ? { backgroundColor: colors.primary, alignSelf: 'flex-end' } : { backgroundColor: colors.surface, borderColor: colors.borderAlt, borderWidth: 1, alignSelf: 'flex-start' }]}>
      <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : { color: colors.text }]}>{item.content}</Text>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AnimatedPressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </AnimatedPressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Image source={require('../../../assets/images/icon.png')} style={styles.headerLogo} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Nekofi AI</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {isReady ? '100% Offline AI' : 'Initializing AI...'}
          </Text>
        </View>
        <Ionicons name={isReady ? "hardware-chip" : "cloud-download"} size={22} color={colors.primary} />
      </View>

      {isDownloading ? (
        <View style={styles.downloadContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.downloadText, { color: colors.text }]}>Downloading AI Model...</Text>
          <Text style={[styles.downloadProgress, { color: colors.textMuted }]}>
            {(downloadProgress * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.downloadInfo, { color: colors.textMuted }]}>
            This happens only once to enable fully offline, private AI.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          {loading && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.textMuted }]}>Nekofi is thinking...</Text>
            </View>
          )}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.borderAlt, color: colors.text }]}
                placeholder="Ask anything about your finances..."
                placeholderTextColor={colors.textMuted}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                editable={isReady}
              />
              <AnimatedPressable style={[styles.sendBtn, { backgroundColor: colors.primary }, (!input.trim() || loading || !isReady) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading || !isReady}>
                <Ionicons name="send" size={18} color="#fff" />
              </AnimatedPressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(20), paddingVertical: moderateScale(14), borderBottomWidth: 1 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8) },
  headerLogo: { width: moderateScale(20), height: moderateScale(20), borderRadius: moderateScale(6) },
  headerTitle: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(16) },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: moderateScale(11) },
  list: { paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(16), gap: moderateScale(12) },
  bubble: { maxWidth: '80%', borderRadius: moderateScale(18), paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(12) },
  bubbleText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), lineHeight: 21 },
  userText: { color: '#fff' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(8), gap: moderateScale(8) },
  typingText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(13) },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(12), borderTopWidth: 1, gap: moderateScale(10) },
  input: { flex: 1, borderRadius: moderateScale(20), paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(12), fontFamily: 'Inter-Regular', fontSize: moderateScale(14), maxHeight: verticalScale(120), borderWidth: 1 },
  sendBtn: { width: scale(44), height: verticalScale(44), borderRadius: moderateScale(22), alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  downloadContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: moderateScale(40), gap: moderateScale(16) },
  downloadText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(18) },
  downloadProgress: { fontFamily: 'Inter-Regular', fontSize: moderateScale(24) },
  downloadInfo: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), textAlign: 'center', marginTop: moderateScale(10) },
});
