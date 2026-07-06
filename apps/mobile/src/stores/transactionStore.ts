/**
 * transactionStore.ts
 *
 * Zustand store for transactions — owns UI state, binary-search sorted array,
 * offline queue, and realtime mutations only.
 * All Supabase I/O has moved to services/transactionService.ts.
 *
 * Responsibilities:
 *   ✓ transactions[] array, sorted descending by date (persisted offline)
 *   ✓ loading / error UI state
 *   ✓ binarySearchInsertIndex — keeps array sorted in O(log n) on insert
 *   ✓ syncStatus mutations (updateSyncStatus, removeLocal)
 *   ✓ realtime INSERT / UPDATE / DELETE handling
 *   ✓ fetchTransactions() → delegates to transactionService
 *   ✓ createTransaction() / deleteTransaction() → local-first, emits sync
 *
 * What moved to services/transactionService.ts:
 *   ✗ All supabase.from() calls
 *   ✗ mapToCamelTx (re-exported here for backward compat)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, CreateTransactionDto } from '@/types/transaction';
import { syncEmitter } from '@/services/syncEmitter';
import type { SyncStatus } from '@/types/account';
import * as transactionService from '@/services/transactionService';

// Re-export mapper for backward compat
export { mapToCamelTx } from '@/services/transactionService';

// ─── Binary search helper ─────────────────────────────────────────────────────

/**
 * binarySearchInsertIndex
 *
 * Finds the correct insertion index in a descending-by-date sorted array.
 * O(log n) search — replaces the previous O(n log n) full sort on every insert.
 *
 * @param arr   Sorted array (descending by date, newest first)
 * @param target Transaction to insert
 * @returns     Index at which to splice the new transaction
 */
export function binarySearchInsertIndex(
  arr: Transaction[],
  target: Transaction,
): number {
  const targetTime = new Date(target.date).getTime();
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (new Date(arr[mid].date).getTime() > targetTime) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchTransactions: (params?: { limit?: number; offset?: number }) => Promise<void>;
  createTransaction: (dto: CreateTransactionDto) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  setTransactions: (transactions: Transaction[]) => void;
  clearTransactions: () => void;
  updateSyncStatus: (id: string, status: SyncStatus) => void;
  removeLocal: (id: string) => void;
  handleRealtimeChange: (payload: any) => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      loading: false,
      error: null,

      setTransactions: (transactions) => set({ transactions }),
      clearTransactions: () => set({ transactions: [] }),

      updateSyncStatus: (id, status) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, syncStatus: status } : t,
          ),
        })),

      removeLocal: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      handleRealtimeChange: (payload) =>
        set((state) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'DELETE') {
            return {
              transactions: state.transactions.filter(
                (t) => t.id !== oldRecord.id,
              ),
            };
          }

          const camelRecord = transactionService.mapToCamelTx(newRecord);
          const index = state.transactions.findIndex(
            (t) => t.id === camelRecord.id,
          );

          if (index >= 0) {
            // UPDATE
            if (
              state.transactions[index].syncStatus &&
              state.transactions[index].syncStatus !== 'synced'
            ) {
              return state; // local pending change takes priority
            }

            const existingDate = state.transactions[index].date;
            if (existingDate === camelRecord.date) {
              // Date unchanged → simple in-place swap, O(1)
              const transactions = state.transactions.slice();
              transactions[index] = camelRecord;
              return { transactions };
            } else {
              // Date changed → remove + binary-search re-insert
              const transactions = state.transactions.filter(
                (t) => t.id !== camelRecord.id,
              );
              const insertAt = binarySearchInsertIndex(transactions, camelRecord);
              transactions.splice(insertAt, 0, camelRecord);
              return { transactions };
            }
          } else {
            // INSERT — O(log n) search + O(n) splice
            const transactions = state.transactions.slice();
            const insertAt = binarySearchInsertIndex(transactions, camelRecord);
            transactions.splice(insertAt, 0, camelRecord);
            return { transactions };
          }
        }),

      // ─── Remote operations (delegate to service) ─────────────────────────

      fetchTransactions: async (params = {}) => {
        const { useAuthStore } = require('@/stores/authStore');
        if (useAuthStore.getState().syncConflict) return;

        set({ loading: true, error: null });
        try {
          const allServerTxs = await transactionService.fetchTransactions(params);

          set((state) => {
            const pending = state.transactions.filter(
              (t) => t.syncStatus && t.syncStatus !== 'synced',
            );
            const pendingIds = new Set(pending.map((p) => p.id));
            const filteredServer = allServerTxs.filter(
              (st) => !pendingIds.has(st.id),
            );
            // Single sort after bulk load — the one justified O(n log n) operation
            const merged = [...pending, ...filteredServer].sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
            return { transactions: merged };
          });
        } catch (err: any) {
          console.warn('Error fetching transactions:', err.message);
        } finally {
          set({ loading: false });
        }
      },

      createTransaction: async (dto) => {
        const { supabase } = require('@/services/supabase/client');
        const { data: userData } = await supabase.auth.getUser();

        const localId = uuidv4();
        const newTx: Transaction = {
          id: localId,
          userId: userData.user?.id || 'guest',
          type: dto.type,
          amount: dto.amount,
          currency: dto.currency,
          category: dto.category,
          description: dto.description,
          date: dto.date,
          receiptUrl: dto.receiptUrl,
          budgetId: dto.budgetId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending_insert',
        };

        set((state) => {
          const transactions = state.transactions.slice();
          const insertAt = binarySearchInsertIndex(transactions, newTx);
          transactions.splice(insertAt, 0, newTx);
          return { transactions };
        });

        syncEmitter.emit();
        return newTx;
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, syncStatus: 'pending_delete' } : t,
          ),
        }));
        syncEmitter.emit();
      },
    }),
    {
      name: 'transaction-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
