import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, CreateAccountDto } from '@/types/account';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  addAccount: (dto: CreateAccountDto) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  fetchAccounts: () => Promise<void>;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      loading: false,
      error: null,
      fetchAccounts: async () => {
        set({ loading: true, error: null });
        try {
          // In a real app, this would fetch from Supabase/API
          // For now, it just loads from local persistence
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
      addAccount: async (dto: CreateAccountDto) => {
        set({ loading: true, error: null });
        try {
          const newAccount: Account = {
            id: Math.random().toString(36).substring(7),
            name: dto.name,
            type: dto.type,
            brandIcon: dto.brandIcon,
            balance: dto.balance || 0,
            currency: dto.currency || 'PHP',
            color: dto.color,
            gradientEnd: dto.gradientEnd,
            textColor: dto.textColor,
            numberMasked: dto.numberMasked,
            createdAt: new Date().toISOString(),
          };
          
          set((state) => ({
            accounts: [...state.accounts, newAccount],
            loading: false
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
      removeAccount: async (id: string) => {
        set((state) => ({
          accounts: state.accounts.filter(a => a.id !== id)
        }));
      }
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
