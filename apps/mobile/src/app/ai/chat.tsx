import React, { useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api/client';
import { Colors } from '@/constants/Colors';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * AI Chat screen — streams responses from Gemini via backend.
 */
export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Nekofi AI 🐱 I can help you analyze your spending, suggest savings tips, and answer any financial questions. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const response = await apiClient.post('/ai/chat', { message: userMsg.content });
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: response.data.reply, timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.', timestamp: new Date() };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.aiText]}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nekofi AI</Text>
          <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
        </View>
        <Ionicons name="sparkles" size={22} color={Colors.primary} />
      </View>

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
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.typingText}>Nekofi is thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything about your finances..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!input.trim() || loading}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  headerSubtitle: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textMuted },
  list: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 },
  userText: { color: '#fff' },
  aiText: { color: Colors.text },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, gap: 8 },
  typingText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
