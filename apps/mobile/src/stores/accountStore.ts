import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/services/supabase/client';
import { Account, CreateAccountDto, SyncStatus } from '@/types/account';
import { syncEmitter } from '@/services/syncEmitter';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  addAccount: (dto: CreateAccountDto) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  fetchAccounts: () => Promise<void>;
  setAccounts: (accounts: Account[]) => void;
  clearAccounts: () => void;
  updateSyncStatus: (id: string, status: SyncStatus) => void;
  removeLocal: (id: string) => void;
}

export const mapToCamelAccount = (item: any): Account => ({
  id: item.id,
  name: item.name,
  type: item.type,
  brandIcon: item.brand_icon,
  balance: Number(item.balance),
  currency: item.currency,
  color: item.color,
  gradientEnd: item.gradient_end,
  textColor: item.text_color,
  numberMasked: item.number_masked,
  createdAt: item.created_at,
  syncStatus: 'synced',
});

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      loading: false,
      error: null,
      
      setAccounts: (accounts) => set({ accounts }),
      clearAccounts: () => set({ accounts: [] }),
      
      updateSyncStatus: (id, status) => set((state) => ({
        accounts: state.accounts.map(a => a.id === id ? { ...a, syncStatus: status } : a)
      })),
      
      removeLocal: (id) => set((state) => ({
        accounts: state.accounts.filter(a => a.id !== id)
      })),

      fetchAccounts: async () => {
        set({ loading: true, error: null });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data, error } = await supabase.from('accounts').select('*');
            if (error) throw error;
            if (data) {
              const serverAccounts = data.map(mapToCamelAccount);
              set((state) => {
                // Keep pending accounts
                const pending = state.accounts.filter(a => a.syncStatus && a.syncStatus !== 'synced');
                // Merge
                const pendingIds = pending.map(p => p.id);
                const filteredServer = serverAccounts.filter(sa => !pendingIds.includes(sa.id));
                return { accounts: [...pending, ...filteredServer] };
              });
            }
          }
        } catch (error: any) {
          console.warn('Error fetching accounts:', error.message);
        } finally {
          set({ loading: false });
        }
      },
      addAccount: async (dto: CreateAccountDto) => {
        set({ loading: true, error: null });
        try {
          const localId = uuidv4();
          const newAccount: Account = {
            id: localId,
            name: dto.name,
            type: dto.type || 'bank',
            brandIcon: dto.brandIcon || 'card-outline',
            balance: dto.balance || 0,
            currency: dto.currency || 'PHP',
            color: dto.color || '#1A1A1A',
            gradientEnd: dto.gradientEnd || '#333333',
            textColor: dto.textColor || '#FFFFFF',
            numberMasked: dto.numberMasked,
            createdAt: new Date().toISOString(),
            syncStatus: 'pending_insert',
          };
          
          set((state) => ({
            accounts: [...state.accounts, newAccount],
            loading: false
          }));

          syncEmitter.emit();
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
      removeAccount: async (id: string) => {
        set((state) => ({
          accounts: state.accounts.map(a => a.id === id ? { ...a, syncStatus: 'pending_delete' } : a)
        }));
        syncEmitter.emit();
      }
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
