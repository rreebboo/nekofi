import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
import type { Transaction, CreateTransactionDto } from '@/types/transaction';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchTransactions: (params?: { limit?: number; offset?: number }) => Promise<void>;
  createTransaction: (dto: CreateTransactionDto) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/transactions', { params });
      set({ transactions: response.data.items });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createTransaction: async (dto) => {
    const response = await apiClient.post('/transactions', dto);
    const tx: Transaction = response.data;
    set((state) => ({ transactions: [tx, ...state.transactions] }));
    return tx;
  },

  deleteTransaction: async (id) => {
    await apiClient.delete(`/transactions/${id}`);
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },
}));
