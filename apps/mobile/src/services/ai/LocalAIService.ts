import * as FileSystem from 'expo-file-system';
import { initLlama, LlamaContext } from 'llama.rn';
import { useAIStore } from '@/store/useAIStore';

// Using Qwen 1.5 0.5B for optimal performance/size on mobile devices
const MODEL_URL = 'https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat-GGUF/resolve/main/qwen1_5-0_5b-chat-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen1_5-0_5b-chat-q4_k_m.gguf';

class LocalAIService {
  private llamaContext: LlamaContext | null = null;
  private isInitializing = false;

  public async initialize(): Promise<void> {
    if (this.llamaContext || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const store = useAIStore.getState();
      const modelPath = `${FileSystem.documentDirectory}${MODEL_FILENAME}`;
      
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      
      if (!fileInfo.exists) {
        store.setIsDownloading(true);
        store.setDownloadProgress(0);

        const downloadResumable = FileSystem.createDownloadResumable(
          MODEL_URL,
          modelPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            store.setDownloadProgress(progress);
          }
        );

        await downloadResumable.downloadAsync();
        store.setIsDownloading(false);
      }

      store.setModelPath(modelPath);

      // Initialize llama.rn context
      this.llamaContext = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 1024, // Keep context smaller to save RAM
      });

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
