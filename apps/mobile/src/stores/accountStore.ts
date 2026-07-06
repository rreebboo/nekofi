/**
 * accountStore.ts
 *
 * Zustand store for accounts — owns UI state, offline queue, and realtime
 * mutations only. All Supabase I/O has moved to services/accountService.ts.
 *
 * Responsibilities:
 *   ✓ accounts[] array (persisted offline)
 *   ✓ loading / error UI state
 *   ✓ syncStatus mutations (updateSyncStatus, removeLocal)
 *   ✓ realtime INSERT / UPDATE / DELETE handling
 *   ✓ fetchAccounts() → delegates to accountService
 *   ✓ addAccount() / removeAccount() → local-first, emits sync
 *
 * What moved to services/accountService.ts:
 *   ✗ All supabase.from() calls
 *   ✗ mapToCamelAccount (still re-exported here for backward compat)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Account, CreateAccountDto, SyncStatus } from '@/types/account';
import { syncEmitter } from '@/services/syncEmitter';
import * as accountService from '@/services/accountService';

// Re-export mapper for any callers that import it from this module
export { mapToCamelAccount } from '@/services/accountService';

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
  handleRealtimeChange: (payload: any) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      loading: false,
      error: null,

      setAccounts: (accounts) => set({ accounts }),
      clearAccounts: () => set({ accounts: [] }),

      updateSyncStatus: (id, status) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, syncStatus: status } : a,
          ),
        })),

      removeLocal: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
        })),

      handleRealtimeChange: (payload) =>
        set((state) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          let accounts = [...state.accounts];

          if (eventType === 'DELETE') {
            // Never delete local-only mock accounts based on a server event
            return {
              accounts: accounts.filter(
                (a) => a.isLocal || a.id !== oldRecord.id,
              ),
            };
          }

          const camelRecord = accountService.mapToCamelAccount(newRecord);
          const index = accounts.findIndex((a) => a.id === camelRecord.id);

          if (index >= 0) {
            // Never overwrite local-only mock accounts or accounts with pending changes
            if (
              accounts[index].isLocal ||
              (accounts[index].syncStatus &&
                accounts[index].syncStatus !== 'synced')
            ) {
              return state;
            }
            accounts[index] = camelRecord;
          } else {
            accounts.push(camelRecord);
          }

          return { accounts };
        }),

      // ─── Remote operations (delegate to service) ──────────────────────────

      fetchAccounts: async () => {
        const { useAuthStore } = require('@/stores/authStore');
        if (useAuthStore.getState().syncConflict) return;

        set({ loading: true, error: null });
        try {
          const serverAccounts = await accountService.fetchAccounts();

          set((state) => {
            const pending = state.accounts.filter(
              (a) => a.syncStatus && a.syncStatus !== 'synced',
            );
            const localOnly = state.accounts.filter((a) => a.isLocal === true);
            const preservedIds = new Set([
              ...pending.map((p) => p.id),
              ...localOnly.map((l) => l.id),
            ]);
            const filteredServer = serverAccounts.filter(
              (sa) => !preservedIds.has(sa.id),
            );
            return {
              accounts: [...pending, ...localOnly, ...filteredServer],
            };
          });
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
            loading: false,
          }));

          syncEmitter.emit();
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      removeAccount: async (id: string) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, syncStatus: 'pending_delete' } : a,
          ),
        }));
        syncEmitter.emit();
      },
    }),
    {
      name: 'account-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
