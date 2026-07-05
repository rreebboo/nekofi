import * as FileSystem from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Lazy accessor to break the require cycle:
// useAIStore → AIOrchestrator → LocalAIService → useAIStore
function getAIStore() {
  const { useAIStore } = require('@/store/useAIStore');
  return useAIStore;
}

// Using Qwen 1.5 0.5B for optimal performance/size on mobile devices
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1_5-0_5b-chat-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen1_5-0_5b-chat-q4_k_m.gguf';
const EXPECTED_SIZE = 407155552;
const RESUME_KEY = 'ai_model_resume_data';
const MAX_RETRIES = 3;

class LocalAIService {
  private llamaContext: LlamaContext | null = null;
  private isInitializing = false;

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async initialize(): Promise<void> {
    if (this.llamaContext || this.isInitializing) return;

    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      console.warn('llama.rn cannot run in Expo Go. You must use a custom development build.');
      getAIStore().getState().setIsReady(false);
      return;
    }

    this.isInitializing = true;

    try {
      const store = getAIStore().getState();
      const modelPath = `${FileSystem.documentDirectory}${MODEL_FILENAME}`;
      
      let retries = 0;
      let modelReady = false;

      while (retries < MAX_RETRIES && !modelReady) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(modelPath);
          
          if (!fileInfo.exists || fileInfo.size !== EXPECTED_SIZE) {
            store.setIsDownloading(true);
            store.setDownloadProgress(0);

            let downloadResumable: FileSystem.DownloadResumable | null = null;
            const resumeString = await AsyncStorage.getItem(RESUME_KEY);

            let lastProgressUpdate = 0;
            const progressCallback = (downloadProgress: FileSystem.DownloadProgressData) => {
              const now = Date.now();
              if (now - lastProgressUpdate > 200) {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                store.setDownloadProgress(progress);
                lastProgressUpdate = now;
              }
            };

            try {
              if (resumeString && fileInfo.exists && fileInfo.size < EXPECTED_SIZE) {
                const parsedData = JSON.parse(resumeString);
                downloadResumable = new FileSystem.DownloadResumable(
                  parsedData.url,
                  parsedData.fileUri,
                  parsedData.options,
                  progressCallback,
                  resumeString
                );
                await downloadResumable.resumeAsync();
              } else {
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(modelPath, { idempotent: true });
                }
                await AsyncStorage.removeItem(RESUME_KEY);
                downloadResumable = FileSystem.createDownloadResumable(MODEL_URL, modelPath, {}, progressCallback);
                await downloadResumable.downloadAsync();
              }
            } catch (downloadError) {
              if (downloadResumable) {
                try {
                  const savable = downloadResumable.savable();
                  await AsyncStorage.setItem(RESUME_KEY, JSON.stringify(savable));
                } catch (e) {
                  // Ignore save error
                }
              }
              throw downloadError;
            }

            store.setIsDownloading(false);
          }

          const checkInfo = await FileSystem.getInfoAsync(modelPath);
          if (checkInfo.exists && checkInfo.size === EXPECTED_SIZE) {
            modelReady = true;
            await AsyncStorage.removeItem(RESUME_KEY);
          } else {
            const actualSize = checkInfo.exists ? checkInfo.size : 'File missing';
            throw new Error(`File size validation failed. Expected: ${EXPECTED_SIZE}, Got: ${actualSize}`);
          }
        } catch (err) {
          retries++;
          console.warn(`Download attempt ${retries} failed:`, err);
          if (retries >= MAX_RETRIES) {
            throw new Error('Failed to download model after multiple attempts.');
          }
          await this.delay(2000);
        }
      }

      store.setModelPath(modelPath);

      // Initialize llama.rn context with larger context window for tool-calling
      try {
        this.llamaContext = await initLlama({
          model: modelPath,
          use_mlock: false, // mlock can cause 'Failed to load model' on Android
          n_ctx: 2048, // Increased from 1024 for richer context (tools + financial data)
        });
      } catch (initError) {
        console.warn('Model initialization failed. Deleting potentially corrupted model file:', initError);
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
        await AsyncStorage.removeItem(RESUME_KEY);
        throw initError;
      }

      store.setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize local AI model:', error);
      getAIStore().getState().setIsDownloading(false);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generate a completion with tool-calling support.
   * Uses a higher token limit to accommodate tool call JSON + natural language response.
   */
  public async completionWithTools(prompt: string, maxTokens: number = 300): Promise<string> {
    if (!this.llamaContext) await this.initialize();
    if (!this.llamaContext) return 'Sorry, the AI model is not ready yet.';

    try {
      const response = await this.llamaContext.completion({
        prompt,
        n_predict: maxTokens,
        stop: ['<|im_end|>', '<|im_start|>'],
        temperature: 0.7,
        top_p: 0.9,
      });
      return response.text.trim();
    } catch (e) {
      console.error('Completion with tools failed:', e);
      return 'Sorry, I encountered an error generating a response.';
    }
  }

  /**
   * Generate a simple insight without tool context.
   * Kept for backward compatibility and lightweight use cases.
   */
  public async generateInsight(): Promise<string> {
    if (!this.llamaContext) await this.initialize();
    if (!this.llamaContext) return 'Track your spending consistently to unlock AI-powered insights.';

    const prompt = `<|im_start|>system
You are a brief, helpful financial assistant.<|im_end|>
<|im_start|>user
Give me one single sentence of financial advice about saving money.<|im_end|>
<|im_start|>assistant
`;

    try {
      const response = await this.llamaContext.completion({
        prompt,
        n_predict: 50,
        stop: ['<|im_end|>', '<|im_start|>'],
      });
      return response.text.trim();
    } catch (e) {
      return 'Track your spending consistently to unlock AI-powered insights.';
    }
  }

  /**
   * Basic chat completion. Now delegates to completionWithTools
   * but kept for backward compatibility.
   */
  public async chat(message: string): Promise<string> {
    const prompt = `<|im_start|>system
You are Nekofi AI, a helpful financial assistant.<|im_end|>
<|im_start|>user
${message}<|im_end|>
<|im_start|>assistant
`;
    return this.completionWithTools(prompt, 150);
  }
}

export const aiService = new LocalAIService();
