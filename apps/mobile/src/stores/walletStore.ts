import { create } from 'zustand';
import { walletService } from '@/services/walletService';
import { Wallet, CreateWalletInput } from '@/types/wallet';
import { useAuthStore } from './authStore';

interface WalletState {
  wallets: Wallet[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchWallets: () => Promise<void>;
  addWallet: (walletInput: CreateWalletInput) => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  clearWallets: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  loading: false,
  error: null,

  fetchWallets: async () => {
    set({ loading: true, error: null });
    try {
      const wallets = await walletService.getWallets();
      set({ wallets, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch wallets', loading: false });
    }
  },

  addWallet: async (walletInput) => {
    set({ loading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not logged in');

      const newWallet = await walletService.createWallet(walletInput, user.id);
      
      // Update local state by appending the new wallet
      set((state) => ({
        wallets: [newWallet, ...state.wallets],
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to add wallet', loading: false });
    }
  },

  removeWallet: async (walletId) => {
    set({ loading: true, error: null });
    try {
      await walletService.deleteWallet(walletId);
      
      // Update local state by removing the wallet
      set((state) => ({
        wallets: state.wallets.filter((w) => w.id !== walletId),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete wallet', loading: false });
    }
  },

  clearWallets: () => {
    set({ wallets: [], error: null, loading: false });
  },
}));
