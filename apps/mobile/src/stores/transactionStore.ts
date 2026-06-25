import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import type { Transaction, CreateTransactionDto } from '@/types/transaction';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  fetchTransactions: (params?: { limit?: number; offset?: number }) => Promise<void>;
  createTransaction: (dto: CreateTransactionDto) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

const mapToCamel = (item: any): Transaction => ({
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
});

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  fetchTransactions: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
        
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      set({ transactions: data.map(mapToCamel) });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createTransaction: async (dto) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const payload = {
      user_id: userData.user.id,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      category: dto.category,
      description: dto.description,
      date: dto.date,
      receipt_url: dto.receiptUrl,
      budget_id: dto.budgetId,
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    
    const tx = mapToCamel(data);
    set((state) => ({ transactions: [tx, ...state.transactions] }));
    return tx;
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
  },
}));
