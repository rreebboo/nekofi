import { create } from 'zustand';
import { apiClient } from '@/services/api/client';
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

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  loading: false,
  error: null,

  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/budgets');
      set({ budgets: response.data.items });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  createBudget: async (dto) => {
    const response = await apiClient.post('/budgets', dto);
    const budget: Budget = response.data;
    set((state) => ({ budgets: [budget, ...state.budgets] }));
    return budget;
  },

  updateBudget: async (id, dto) => {
    const response = await apiClient.patch(`/budgets/${id}`, dto);
    const updated: Budget = response.data;
    set((state) => ({ budgets: state.budgets.map((b) => (b.id === id ? updated : b)) }));
    return updated;
  },

  deleteBudget: async (id) => {
    await apiClient.delete(`/budgets/${id}`);
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
  },
}));
