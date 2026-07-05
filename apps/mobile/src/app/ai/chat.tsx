import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAIStore, UIMessage } from '@/store/useAIStore';
import { useNekofiStore } from '@/store/nekofiStore';
import { NekofiCompanion } from '@/components/NekofiCompanion';
import { useThemeColors } from '@/hooks/useThemeColors';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';

/** Quick action suggestion chips */
const QUICK_ACTIONS = [
  'How much did I spend this month?',
  'Show my budgets',
  'What are my top expenses?',
  'Am I over budget?',
  'Show my accounts',
];

/**
 * AI Chat screen — full-featured chat with tool calling, confirmations,
 * and rich result rendering, powered by the local LLM.
 */
export default function AIChatScreen() {
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const colors = useThemeColors();
  
  // AI State
  const {
    isDownloading,
    downloadProgress,
    isReady,
    messages,
    isProcessing,
    activeToolName,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    rejectAction,
    clearConversation,
  } = useAIStore();

  const { triggerAnimation } = useNekofiStore();

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing || !isReady) return;
    
    const text = input.trim();
    setInput('');
    triggerAnimation('AI Thinking', null, 0);
    
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    await sendMessage(text);

    // React to the result
    const state = useAIStore.getState();
    if (state.pendingConfirmation) {
      triggerAnimation('Concerned', null, 0);
    } else {
      triggerAnimation('Happy', null, 4000);
    }

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
  }, [input, isProcessing, isReady, sendMessage, triggerAnimation]);

  const handleQuickAction = useCallback((text: string) => {
    setInput(text);
    // Auto-send after a tiny delay so the UI updates
    setTimeout(() => {
      useAIStore.getState().sendMessage(text);
      triggerAnimation('AI Thinking', null, 0);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, 50);
  }, [triggerAnimation]);

  const handleConfirm = useCallback(async () => {
    triggerAnimation('AI Thinking', 'Processing...', 0);
    await confirmAction();
    triggerAnimation('Celebration', 'Done!', 4000);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
  }, [confirmAction, triggerAnimation]);

  const handleReject = useCallback(() => {
    rejectAction();
    triggerAnimation('Happy', null, 3000);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
  }, [rejectAction, triggerAnimation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages.length]);

  const renderToolBadge = (toolName: string, success: boolean) => {
    const TOOL_LABELS: Record<string, { icon: string; label: string }> = {
      get_transactions: { icon: '📋', label: 'Transactions' },
      get_transaction_summary: { icon: '📊', label: 'Summary' },
      get_budgets: { icon: '🎯', label: 'Budgets' },
      get_budget_detail: { icon: '🔍', label: 'Budget Detail' },
      get_accounts: { icon: '🏦', label: 'Accounts' },
      get_spending_insights: { icon: '💡', label: 'Insights' },
      get_profile: { icon: '👤', label: 'Profile' },
      create_transaction: { icon: '➕', label: 'Added Transaction' },
      create_budget: { icon: '📝', label: 'Created Budget' },
      update_budget: { icon: '✏️', label: 'Updated Budget' },
      update_settings: { icon: '⚙️', label: 'Settings' },
      delete_transaction: { icon: '🗑️', label: 'Deleted Transaction' },
      delete_budget: { icon: '🗑️', label: 'Deleted Budget' },
    };

    const info = TOOL_LABELS[toolName] || { icon: '🔧', label: toolName };

    return (
      <View
        key={toolName}
        style={[
          styles.toolBadge,
          {
            backgroundColor: success ? `${colors.primary}20` : `${colors.error}20`,
            borderColor: success ? `${colors.primary}40` : `${colors.error}40`,
          },
        ]}
      >
        <Text style={styles.toolBadgeText}>
          {info.icon} {info.label}
        </Text>
      </View>
    );
  };

  const renderConfirmationCard = () => {
    if (!pendingConfirmation) return null;

    return (
      <Animated.View entering={FadeInDown.springify()} style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: `${colors.warning}60` }]}>
        <View style={styles.confirmHeader}>
          <Ionicons name="warning" size={20} color={colors.warning} />
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Confirm Action</Text>
        </View>
        <Text style={[styles.confirmDescription, { color: colors.textMuted }]}>
          {pendingConfirmation.description}
        </Text>
        <View style={styles.confirmButtons}>
          <AnimatedPressable
            style={[styles.confirmBtn, styles.confirmBtnCancel, { borderColor: colors.border }]}
            onPress={handleReject}
          >
            <Text style={[styles.confirmBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.confirmBtn, styles.confirmBtnConfirm, { backgroundColor: colors.error }]}
            onPress={handleConfirm}
          >
            <Text style={[styles.confirmBtnText, { color: '#fff' }]}>Confirm</Text>
          </AnimatedPressable>
        </View>
      </Animated.View>
    );
  };

  const renderItem = ({ item }: { item: UIMessage }) => {
    const isAssistant = item.role === 'assistant';
    
    if (isAssistant) {
      return (
        <Animated.View entering={FadeInDown.springify()} style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
          <View style={{ alignItems: 'flex-start', marginBottom: -verticalScale(45), marginLeft: -scale(16), zIndex: 0 }}>
            <NekofiCompanion size={scale(100)} hideBubble={true} inline={true} />
          </View>
          <View 
            style={[
              styles.bubble, 
              { backgroundColor: colors.surface, borderColor: colors.borderAlt, borderWidth: 1, borderTopLeftRadius: 4, zIndex: 1, maxWidth: '100%' }
            ]}
          >
            {/* Tool badges */}
            {item.toolsUsed && item.toolsUsed.length > 0 && (
              <View style={styles.toolBadgeRow}>
                {item.toolsUsed.map(t => renderToolBadge(t.tool, t.success))}
              </View>
            )}
            <Text style={[styles.bubbleText, { color: colors.text }]}>{item.content}</Text>
          </View>

          {/* Confirmation card attached to the message */}
          {item.isConfirmation && pendingConfirmation && renderConfirmationCard()}
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        entering={FadeInDown.springify()} 
        style={[
          styles.bubble, 
          { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
        ]}
      >
        <Text style={[styles.bubbleText, styles.userText]}>{item.content}</Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
            {isReady ? '100% On-Device AI • Full System Access' : 'Initializing AI...'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isReady && (
            <AnimatedPressable onPress={clearConversation} style={styles.headerBtn}>
              <Ionicons name="refresh" size={20} color={colors.textMuted} />
            </AnimatedPressable>
          )}
          <Ionicons name={isReady ? "hardware-chip" : "cloud-download"} size={22} color={colors.primary} />
        </View>
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
            ListHeaderComponent={
              messages.length <= 1 ? (
                <Animated.View entering={FadeIn.delay(300)} style={styles.quickActionsContainer}>
                  <Text style={[styles.quickActionsLabel, { color: colors.textMuted }]}>Try asking:</Text>
                  <View style={styles.quickActionsGrid}>
                    {QUICK_ACTIONS.map((action) => (
                      <AnimatedPressable
                        key={action}
                        style={[styles.quickActionChip, { backgroundColor: colors.surface, borderColor: colors.borderAlt }]}
                        onPress={() => handleQuickAction(action)}
                      >
                        <Text style={[styles.quickActionText, { color: colors.text }]}>{action}</Text>
                      </AnimatedPressable>
                    ))}
                  </View>
                </Animated.View>
              ) : null
            }
          />

          {/* Processing indicator */}
          {isProcessing && (
            <Animated.View entering={FadeIn} style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.textMuted }]}>
                {activeToolName
                  ? `🔧 Analyzing ${activeToolName.replace(/_/g, ' ').replace('get ', '')}...`
                  : 'Nekofi is thinking...'}
              </Text>
            </Animated.View>
          )}

          {/* Input bar */}
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
                onSubmitEditing={handleSend}
                editable={isReady && !isProcessing}
              />
              <AnimatedPressable
                style={[
                  styles.sendBtn,
                  { backgroundColor: colors.primary },
                  (!input.trim() || isProcessing || !isReady) && styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={!input.trim() || isProcessing || !isReady}
              >
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(12) },
  headerBtn: { padding: moderateScale(4) },
  list: { paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(16), gap: moderateScale(12) },
  bubble: { maxWidth: '80%', borderRadius: moderateScale(18), paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(12) },
  bubbleText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), lineHeight: 21 },
  userText: { color: '#fff' },

  // Tool badges
  toolBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(6), marginBottom: moderateScale(8) },
  toolBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(3), borderRadius: moderateScale(10), borderWidth: 1 },
  toolBadgeText: { fontFamily: 'Inter-Medium', fontSize: moderateScale(11) },

  // Confirmation card
  confirmCard: { marginTop: moderateScale(8), borderRadius: moderateScale(14), borderWidth: 1, padding: moderateScale(16), maxWidth: '100%' },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(8), marginBottom: moderateScale(8) },
  confirmTitle: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(14) },
  confirmDescription: { fontFamily: 'Inter-Regular', fontSize: moderateScale(13), lineHeight: 19, marginBottom: moderateScale(12) },
  confirmButtons: { flexDirection: 'row', gap: moderateScale(10) },
  confirmBtn: { flex: 1, paddingVertical: moderateScale(10), borderRadius: moderateScale(10), alignItems: 'center' },
  confirmBtnCancel: { borderWidth: 1 },
  confirmBtnConfirm: {},
  confirmBtnText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(13) },

  // Quick actions
  quickActionsContainer: { paddingVertical: moderateScale(8), gap: moderateScale(10) },
  quickActionsLabel: { fontFamily: 'Inter-Medium', fontSize: moderateScale(12) },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: moderateScale(8) },
  quickActionChip: { paddingHorizontal: moderateScale(14), paddingVertical: moderateScale(8), borderRadius: moderateScale(16), borderWidth: 1 },
  quickActionText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(13) },

  // Processing indicator
  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(8), gap: moderateScale(8) },
  typingText: { fontFamily: 'Inter-Regular', fontSize: moderateScale(13) },

  // Input bar
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(12), borderTopWidth: 1, gap: moderateScale(10) },
  input: { flex: 1, borderRadius: moderateScale(20), paddingHorizontal: moderateScale(16), paddingVertical: moderateScale(12), fontFamily: 'Inter-Regular', fontSize: moderateScale(14), maxHeight: verticalScale(120), borderWidth: 1 },
  sendBtn: { width: scale(44), height: verticalScale(44), borderRadius: moderateScale(22), alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  downloadContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: moderateScale(40), gap: moderateScale(16) },
  downloadText: { fontFamily: 'Inter-SemiBold', fontSize: moderateScale(18) },
  downloadProgress: { fontFamily: 'Inter-Regular', fontSize: moderateScale(24) },
  downloadInfo: { fontFamily: 'Inter-Regular', fontSize: moderateScale(14), textAlign: 'center', marginTop: moderateScale(10) },
});
