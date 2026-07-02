import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/services/supabase/client';
import type { Budget, CreateBudgetDto, CreateBudgetGroupDto, BudgetGroup } from '@/types/budget';
import type { Transaction } from '@/types/transaction';
import { syncEmitter } from '@/services/syncEmitter';
import type { SyncStatus } from '@/types/account';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  fetchBudgets: () => Promise<void>;
  createBudget: (dto: CreateBudgetDto) => Promise<Budget>;
  createBudgetGroup: (dto: CreateBudgetGroupDto) => Promise<Budget[]>;
  updateBudget: (id: string, dto: Partial<CreateBudgetDto>) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  deleteBudgetGroup: (name: string) => Promise<void>;
  setBudgets: (budgets: Budget[]) => void;
  clearBudgets: () => void;
  updateSyncStatus: (id: string, status: SyncStatus) => void;
  removeLocal: (id: string) => void;
}

export const mapToCamel = (item: any): Budget => ({
  id: item.id,
  userId: item.user_id,
  name: item.name,
  category: item.category,
  amount: Number(item.amount),
  spent: Number(item.spent || 0),
  currency: item.currency,
  period: item.period,
  startDate: item.start_date,
  endDate: item.end_date,
  color: item.color,
  emoji: item.emoji,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  syncStatus: 'synced',
});

export const computeBudgetGroups = (budgets: Budget[], transactions?: Transaction[]): BudgetGroup[] => {
  const groups: Record<string, BudgetGroup> = {};
  
  // Filter out pending deletes so they don't show up in groups
  const activeBudgets = budgets.filter(b => b.syncStatus !== 'pending_delete');

  activeBudgets.forEach(b => {
    if (!groups[b.name]) {
      groups[b.name] = {
        name: b.name,
        period: b.period,
        startDate: b.startDate,
        endDate: b.endDate,
        color: b.color,
        emoji: b.emoji,
        totalAmount: 0,
        totalSpent: 0,
        categories: []
      };
    }
    groups[b.name].totalAmount += b.amount;
    groups[b.name].categories.push(b);
  });
  
  const result = Object.values(groups);

  if (transactions) {
    result.forEach(group => {
      const start = new Date(group.startDate);
      const end = group.endDate ? new Date(group.endDate) : new Date(8640000000000000);
      
      const groupTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        if (tDate < start || tDate > end) return false;
        if (t.type !== 'expense') return false;
        return group.categories.some(cat => cat.category === t.category);
      });

      group.totalSpent = groupTransactions.reduce((acc, t) => acc + t.amount, 0);
    });
  } else {
    activeBudgets.forEach(b => {
      groups[b.name].totalSpent += b.spent;
    });
  }

  return result;
};

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budgets: [],
      loading: false,
      error: null,

      setBudgets: (budgets) => set({ budgets }),
      clearBudgets: () => set({ budgets: [] }),
      
      updateSyncStatus: (id, status) => set((state) => ({
        budgets: state.budgets.map(b => b.id === id ? { ...b, syncStatus: status } : b)
      })),
      
      removeLocal: (id) => set((state) => ({
        budgets: state.budgets.filter(b => b.id !== id)
      })),

      fetchBudgets: async () => {
        set({ loading: true, error: null });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const { data, error } = await supabase.from('budgets').select('*');
            if (error) throw error;
            if (data) {
              const serverBudgets = data.map(mapToCamel);
              set((state) => {
                const pending = state.budgets.filter(b => b.syncStatus && b.syncStatus !== 'synced');
                const pendingIds = pending.map(p => p.id);
                const filteredServer = serverBudgets.filter(sb => !pendingIds.includes(sb.id));
                return { budgets: [...pending, ...filteredServer] };
              });
            }
          }
        } catch (err: any) {
          console.warn('Error fetching budgets:', err.message);
        } finally {
          set({ loading: false });
        }
      },

      createBudget: async (dto) => {
        const { data: userData } = await supabase.auth.getUser();
        
        const localId = uuidv4();
        const newBudget: Budget = {
          id: localId,
          userId: userData.user?.id || 'guest',
          name: dto.name,
          category: dto.category,
          amount: dto.amount,
          spent: 0,
          currency: dto.currency,
          period: dto.period,
          startDate: dto.startDate,
          endDate: dto.endDate,
          color: dto.color,
          emoji: dto.emoji,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending_insert',
        };

        set((state) => ({ budgets: [newBudget, ...state.budgets] }));
        syncEmitter.emit();
        return newBudget;
      },

      createBudgetGroup: async (dto) => {
        const { data: userData } = await supabase.auth.getUser();
        
        const newBudgets: Budget[] = dto.categories.map(cat => ({
          id: uuidv4(),
          userId: userData.user?.id || 'guest',
          name: dto.name,
          category: cat.categoryId,
          amount: cat.amount,
          spent: 0,
          currency: dto.currency,
          period: dto.period,
          startDate: dto.startDate,
          endDate: dto.endDate,
          color: dto.color,
          emoji: dto.emoji,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending_insert',
        }));

        set((state) => ({ budgets: [...newBudgets, ...state.budgets] }));
        syncEmitter.emit();
        return newBudgets;
      },

      updateBudget: async (id, dto) => {
        set((state) => ({
          budgets: state.budgets.map((b) => {
            if (b.id === id) {
              const status = b.syncStatus === 'pending_insert' ? 'pending_insert' : 'pending_update';
              return { ...b, ...dto, updatedAt: new Date().toISOString(), syncStatus: status } as Budget;
            }
            return b;
          })
        }));
        syncEmitter.emit();
        return get().budgets.find(b => b.id === id)!;
      },

      deleteBudget: async (id) => {
        set((state) => ({ 
          budgets: state.budgets.map((b) => b.id === id ? { ...b, syncStatus: 'pending_delete' } : b)
        }));
        syncEmitter.emit();
      },

      deleteBudgetGroup: async (name) => {
        set((state) => ({ 
          budgets: state.budgets.map((b) => b.name === name ? { ...b, syncStatus: 'pending_delete' } : b)
        }));
        syncEmitter.emit();
      },
    }),
    {
      name: 'budget-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
