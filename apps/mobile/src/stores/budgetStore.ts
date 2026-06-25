import { create } from 'zustand';
import { supabase } from '@/services/supabase/client';
import type { Budget, CreateBudgetDto } from '@/types/budget';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  fetchBudgets: () => Promise<void>;
  createBudget: (dto: CreateBudgetDto) => Promise<Budget>;
  updateBudget: (id: string, dto: Partial<CreateBudgetDto>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
}

const mapToCamel = (item: any): Budget => ({
  id: item.id,
  userId: item.user_id,
  name: item.name,
  category: item.category,
  amount: Number(item.amount),
  spent: Number(item.spent),
  currency: item.currency,
  period: item.period,
  startDate: item.start_date,
  endDate: item.end_date,
  color: item.color,
  emoji: item.emoji,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  loading: false,
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('budgets').select('*');
      if (error) throw error;
      set({ budgets: data.map(mapToCamel) });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createBudget: async (dto) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const payload = {
      user_id: userData.user.id,
      name: dto.name,
      category: dto.category,
      amount: dto.amount,
      currency: dto.currency,
      period: dto.period,
      start_date: dto.startDate,
      color: dto.color,
      emoji: dto.emoji,
    };

    const { data, error } = await supabase
      .from('budgets')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    
    const budget = mapToCamel(data);
    set((state) => ({ budgets: [budget, ...state.budgets] }));
    return budget;
  },

  updateBudget: async (id, dto) => {
    const payload: any = {};
    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.category !== undefined) payload.category = dto.category;
    if (dto.amount !== undefined) payload.amount = dto.amount;
    if (dto.currency !== undefined) payload.currency = dto.currency;
    if (dto.period !== undefined) payload.period = dto.period;
    if (dto.startDate !== undefined) payload.start_date = dto.startDate;
    if (dto.color !== undefined) payload.color = dto.color;
    if (dto.emoji !== undefined) payload.emoji = dto.emoji;

    const { data, error } = await supabase
      .from('budgets')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    const updated = mapToCamel(data);
    set((state) => ({ budgets: state.budgets.map((b) => (b.id === id ? updated : b)) }));
    return updated;
  },

  deleteBudget: async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
  },
}));
