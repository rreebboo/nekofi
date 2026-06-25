import { create } from 'zustand';

interface AIState {
  isDownloading: boolean;
  downloadProgress: number;
  isReady: boolean;
  modelPath: string | null;
  setIsDownloading: (isDownloading: boolean) => void;
  setDownloadProgress: (progress: number) => void;
  setIsReady: (isReady: boolean) => void;
  setModelPath: (path: string | null) => void;
}

export const useAIStore = create<AIState>((set) => ({
  isDownloading: false,
  downloadProgress: 0,
  isReady: false,
  modelPath: null,
  setIsDownloading: (isDownloading) => set({ isDownloading }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setIsReady: (isReady) => set({ isReady }),
  setModelPath: (modelPath) => set({ modelPath }),
}));
