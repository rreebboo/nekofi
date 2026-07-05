import { create } from 'zustand';
import { processMessage, executeConfirmedAction, generateInsight, ChatMessage, OrchestratorResponse } from '@/services/ai/AIOrchestrator';
import type { ToolResult } from '@/services/ai/AIToolExecutor';

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** If the assistant used tools, this tracks what was called */
  toolsUsed?: { tool: string; success: boolean }[];
  /** If this message is a confirmation request */
  isConfirmation?: boolean;
}

interface AIState {
  // Model state
  isDownloading: boolean;
  downloadProgress: number;
  isReady: boolean;
  modelPath: string | null;

  // Conversation state
  messages: UIMessage[];
  isProcessing: boolean;
  activeToolName: string | null;
  streamingText: string;

  // Confirmation state
  pendingConfirmation: {
    toolName: string;
    params: Record<string, any>;
    description: string;
  } | null;

  // Dashboard insight
  latestInsight: string;
  insightLoading: boolean;

  // Internal conversation history for the orchestrator (ChatML format)
  _conversationHistory: ChatMessage[];

  // Model state setters
  setIsDownloading: (isDownloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
  setIsReady: (isReady: boolean) => void;
  setModelPath: (path: string | null) => void;

  // Chat actions
  sendMessage: (text: string) => Promise<void>;
  confirmAction: () => Promise<void>;
  rejectAction: () => void;
  clearConversation: () => void;

  // Insight actions
  refreshInsight: () => Promise<void>;
}

export const useAIStore = create<AIState>((set, get) => ({
  // Model state
  isDownloading: false,
  downloadProgress: 0,
  isReady: false,
  modelPath: null,

  // Conversation state
  messages: [
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Nekofi AI 🐱 I can see your finances and help you manage them. Try asking me:\n\n• \"How much did I spend this month?\"\n• \"Show my budgets\"\n• \"Add a ₱200 expense for food\"\n• \"Am I over budget?\"",
      timestamp: new Date(),
    },
  ],
  isProcessing: false,
  activeToolName: null,
  streamingText: '',
  pendingConfirmation: null,
  latestInsight: '',
  insightLoading: false,
  _conversationHistory: [],

  // Model state setters
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setIsReady: (isReady) => set({ isReady }),
  setModelPath: (modelPath) => set({ modelPath }),

  // ─── Chat ──────────────────────────────────────────────────

  sendMessage: async (text: string) => {
    const state = get();
    if (state.isProcessing || !state.isReady) return;

    const userMsg: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    // Add user message to UI
    set((s) => ({
      messages: [...s.messages, userMsg],
      isProcessing: true,
      activeToolName: null,
      pendingConfirmation: null,
    }));

    try {
      const history = get()._conversationHistory;

      const response: OrchestratorResponse = await processMessage(
        text.trim(),
        history,
        (toolName) => {
          set({ activeToolName: toolName });
        },
      );

      // Build the assistant message
      const assistantMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date(),
        toolsUsed: response.toolCalls.map((tc) => ({
          tool: tc.tool,
          success: tc.result.success,
        })),
        isConfirmation: !!response.requiresConfirmation,
      };

      // Update conversation history for next turn
      const updatedHistory: ChatMessage[] = [
        ...history,
        { role: 'user' as const, content: text.trim() },
        { role: 'assistant' as const, content: response.text },
      ];

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        _conversationHistory: updatedHistory.slice(-6), // sliding window
        pendingConfirmation: response.requiresConfirmation || null,
      }));
    } catch (error: any) {
      const errMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try rephrasing?',
        timestamp: new Date(),
      };
      set((s) => ({ messages: [...s.messages, errMsg] }));
    } finally {
      set({ isProcessing: false, activeToolName: null });
    }
  },

  confirmAction: async () => {
    const state = get();
    if (!state.pendingConfirmation) return;

    const { toolName, params, description } = state.pendingConfirmation;

    set({ isProcessing: true, pendingConfirmation: null });

    try {
      const result: ToolResult = await executeConfirmedAction(toolName, params);

      const confirmMsg: UIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: result.success
          ? result.message
          : `❌ Failed: ${result.message}`,
        timestamp: new Date(),
        toolsUsed: [{ tool: toolName, success: result.success }],
      };

      set((s) => ({ messages: [...s.messages, confirmMsg] }));
    } catch (error: any) {
      const errMsg: UIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error executing action: ${error.message}`,
        timestamp: new Date(),
      };
      set((s) => ({ messages: [...s.messages, errMsg] }));
    } finally {
      set({ isProcessing: false });
    }
  },

  rejectAction: () => {
    const cancelMsg: UIMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'No problem, I cancelled that action. Is there anything else I can help with?',
      timestamp: new Date(),
    };

    set((s) => ({
      messages: [...s.messages, cancelMsg],
      pendingConfirmation: null,
    }));
  },

  clearConversation: () => {
    set({
      messages: [
        {
          id: '0',
          role: 'assistant',
          content: "Conversation cleared! I'm ready to help with your finances. What would you like to know?",
          timestamp: new Date(),
        },
      ],
      _conversationHistory: [],
      pendingConfirmation: null,
    });
  },

  // ─── Dashboard Insight ─────────────────────────────────────

  refreshInsight: async () => {
    const state = get();
    if (state.insightLoading || !state.isReady) return;

    set({ insightLoading: true });

    try {
      const insight = await generateInsight();
      set({ latestInsight: insight });
    } catch {
      set({ latestInsight: 'Track your spending to unlock personalized insights! 📊' });
    } finally {
      set({ insightLoading: false });
    }
  },
}));
