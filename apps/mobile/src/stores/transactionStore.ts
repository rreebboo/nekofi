import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/services/supabase/client';
import type { Transaction, CreateTransactionDto } from '@/types/transaction';
import { syncEmitter } from '@/services/syncEmitter';
import type { SyncStatus } from '@/types/account';

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

export const mapToCamelTx = (item: any): Transaction => ({
  id: item.id,
  userId: item.user_id,
  type: item.type,
  amount: Number(item.amount),
  currency: item.currency,
  category: item.category,
  description: item.description,
  date: item.date,
  receiptUrl: item.receipt_url,
  budgetId: item.budget_id,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  syncStatus: 'synced',
});

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      loading: false,
      error: null,

      setTransactions: (transactions) => set({ transactions }),
      clearTransactions: () => set({ transactions: [] }),

      updateSyncStatus: (id, status) => set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, syncStatus: status } : t)
      })),
      
      removeLocal: (id) => set((state) => ({
        transactions: state.transactions.filter(t => t.id !== id)
      })),

      handleRealtimeChange: (payload) => set((state) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        let transactions = [...state.transactions];
        
        if (eventType === 'DELETE') {
          return { transactions: transactions.filter(t => t.id !== oldRecord.id) };
        }
        
        const camelRecord = mapToCamelTx(newRecord);
        const index = transactions.findIndex(t => t.id === camelRecord.id);
        
        if (index >= 0) {
          if (transactions[index].syncStatus && transactions[index].syncStatus !== 'synced') {
            return state;
          }
          transactions[index] = camelRecord;
        } else {
          transactions.push(camelRecord);
          // Trigger notification for collaborator additions
          supabase.auth.getUser().then(({ data }) => {
            if (data.user && camelRecord.userId !== data.user.id) {
              const { processTransactionNotification } = require('@/services/notificationService');
              processTransactionNotification(camelRecord);
            }
          });
        }
        
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { transactions };
      }),

      fetchTransactions: async (params = {}) => {
        const { useAuthStore } = require('@/stores/authStore');
        if (useAuthStore.getState().syncConflict) return;

        set({ loading: true, error: null });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            let query = supabase
              .from('transactions')
              .select('*')
              .order('date', { ascending: false });
              
            if (params.limit) {
              query = query.limit(params.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            if (data) {
              const serverTxs = data.map(mapToCamelTx);
              set((state) => {
                const pending = state.transactions.filter(t => t.syncStatus && t.syncStatus !== 'synced');
                const pendingIds = pending.map(p => p.id);
                const filteredServer = serverTxs.filter(st => !pendingIds.includes(st.id));
                // Keep the pending ones sorted correctly would require re-sorting, but for now just prepend them
                const merged = [...pending, ...filteredServer].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return { transactions: merged };
              });
            }
          }
        } catch (err: any) {
          console.warn('Error fetching transactions:', err.message);
        } finally {
          set({ loading: false });
        }
      },

      createTransaction: async (dto) => {
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

        set((state) => ({ transactions: [newTx, ...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
        syncEmitter.emit();
        
        // Trigger notification
        const { processTransactionNotification } = require('@/services/notificationService');
        processTransactionNotification(newTx);

        return newTx;
      },

      deleteTransaction: async (id) => {
        set((state) => ({ 
          transactions: state.transactions.map((t) => t.id === id ? { ...t, syncStatus: 'pending_delete' } : t)
        }));
        syncEmitter.emit();
      },
    }),
    {
      name: 'transaction-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
