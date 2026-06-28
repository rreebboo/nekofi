import * as FileSystem from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { useAIStore } from '@/store/useAIStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

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
      useAIStore.getState().setIsReady(false);
      return;
    }

    this.isInitializing = true;

    try {
      const store = useAIStore.getState();
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

            const progressCallback = (downloadProgress: FileSystem.DownloadProgressData) => {
              const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
              store.setDownloadProgress(progress);
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

      // Initialize llama.rn context
      try {
        this.llamaContext = await initLlama({
          model: modelPath,
          use_mlock: false, // mlock can cause 'Failed to load model' on Android
          n_ctx: 1024, // Keep context smaller to save RAM
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
      useAIStore.getState().setIsDownloading(false);
    } finally {
      this.isInitializing = false;
    }
  }

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
      });
      return response.text.trim();
    } catch (e) {
      return 'Track your spending consistently to unlock AI-powered insights.';
    }
  }

  public async chat(message: string): Promise<string> {
    if (!this.llamaContext) await this.initialize();
    if (!this.llamaContext) return 'Sorry, the AI model is not ready yet.';

    const prompt = `<|im_start|>system
You are Nekofi AI, a helpful financial assistant.<|im_end|>
<|im_start|>user
${message}<|im_end|>
<|im_start|>assistant
`;

    try {
      const response = await this.llamaContext.completion({
        prompt,
        n_predict: 150,
      });
      return response.text.trim();
    } catch (e) {
      return 'Sorry, I encountered an error generating a response.';
    }
  }
}

export const aiService = new LocalAIService();
