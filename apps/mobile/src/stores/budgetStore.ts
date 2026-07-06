/**
 * budgetStore.ts
 *
 * Zustand store for budgets — owns UI state, offline queue, and realtime
 * mutations only. All Supabase I/O has moved to services/budgetService.ts.
 *
 * Responsibilities:
 *   ✓ budgets[], invites[], collaborators[] arrays (persisted offline)
 *   ✓ loading / error UI state
 *   ✓ syncStatus mutations (updateSyncStatus, removeLocal)
 *   ✓ realtime INSERT / UPDATE / DELETE / members handling
 *   ✓ All fetch/mutate actions → delegate to budgetService
 *
 * What moved to services/budgetService.ts:
 *   ✗ All supabase.from() calls and supabase.rpc() calls
 *   ✗ mapToCamel, mapToInviteCamel, mapToCollaboratorCamel (re-exported here for compat)
 *
 * computeBudgetGroups is a pure business-logic function — it stays here
 * so all existing import sites (`import { computeBudgetGroups } from '@/stores/budgetStore'`)
 * continue to work without changes.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import type {
  Budget,
  CreateBudgetDto,
  CreateBudgetGroupDto,
  BudgetGroup,
  BudgetInvite,
  BudgetCollaborator,
} from '@/types/budget';
import type { Transaction } from '@/types/transaction';
import { syncEmitter } from '@/services/syncEmitter';
import type { SyncStatus } from '@/types/account';
import * as budgetService from '@/services/budgetService';

// Re-export mappers for backward compat (callers that import from this module)
export {
  mapToCamel,
  mapToInviteCamel,
  mapToCollaboratorCamel,
} from '@/services/budgetService';

// ─── Pure business logic (no side effects, stays in store file) ───────────────

export const computeBudgetGroups = (
  budgets: Budget[],
  transactions?: Transaction[],
): BudgetGroup[] => {
  const groups: Record<string, BudgetGroup> = {};

  const activeBudgets = budgets.filter(
    (b) => b.syncStatus !== 'pending_delete',
  );

  activeBudgets.forEach((b) => {
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
        categories: [],
      };
    }
    groups[b.name].totalAmount += b.amount;
    groups[b.name].categories.push(b);
  });

  const result = Object.values(groups);

  if (transactions) {
    result.forEach((group) => {
      const start = new Date(group.startDate);
      const end = group.endDate
        ? new Date(group.endDate)
        : new Date(8640000000000000);

      const groupTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        if (tDate < start || tDate > end) return false;
        if (t.type !== 'expense') return false;
        return group.categories.some((cat) => cat.category === t.category);
      });

      group.totalSpent = groupTransactions.reduce(
        (acc, t) => acc + t.amount,
        0,
      );
    });
  } else {
    activeBudgets.forEach((b) => {
      groups[b.name].totalSpent += b.spent;
    });
  }

  return result;
};

// ─── Store interface ──────────────────────────────────────────────────────────

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
  handleRealtimeChange: (payload: any) => void;

  invites: BudgetInvite[];
  collaborators: BudgetCollaborator[];
  fetchInvites: () => Promise<void>;
  fetchCollaborators: (budgetName: string) => Promise<void>;
  inviteUser: (budgetName: string, email: string) => Promise<void>;
  acceptInvite: (budgetName: string, ownerId: string) => Promise<void>;
  declineInvite: (budgetName: string, ownerId: string) => Promise<void>;
  removeCollaborator: (
    budgetName: string,
    ownerId: string,
    userId: string,
  ) => Promise<void>;
  handleMembersRealtimeChange: () => void;

  previewBudgetByCode: (
    code: string,
  ) => Promise<import('@/types/budget').BudgetPreview | null>;
  joinBudgetByCode: (code: string) => Promise<void>;
  regenerateInviteCode: (budgetName: string) => Promise<string>;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budgets: [],
      invites: [],
      collaborators: [],
      loading: false,
      error: null,

      setBudgets: (budgets) => set({ budgets }),
      clearBudgets: () => set({ budgets: [] }),

      updateSyncStatus: (id, status) =>
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, syncStatus: status } : b,
          ),
        })),

      removeLocal: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        })),

      handleRealtimeChange: (payload) =>
        set((state) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          let budgets = [...state.budgets];

          if (eventType === 'DELETE') {
            return { budgets: budgets.filter((b) => b.id !== oldRecord.id) };
          }

          const camelRecord = budgetService.mapToCamel(newRecord);
          const index = budgets.findIndex((b) => b.id === camelRecord.id);

          if (index >= 0) {
            if (
              budgets[index].syncStatus &&
              budgets[index].syncStatus !== 'synced'
            ) {
              return state;
            }
            budgets[index] = camelRecord;
          } else {
            budgets.push(camelRecord);
          }

          return { budgets };
        }),

      handleMembersRealtimeChange: () => {
        get().fetchInvites();
        get().fetchBudgets();
      },

      // ─── Remote operations (delegate to service) ────────────────────────

      fetchBudgets: async () => {
        const { useAuthStore } = require('@/stores/authStore');
        if (useAuthStore.getState().syncConflict) return;

        set({ loading: true, error: null });
        try {
          const serverBudgets = await budgetService.fetchBudgets();

          set((state) => {
            const pending = state.budgets.filter(
              (b) => b.syncStatus && b.syncStatus !== 'synced',
            );
            const pendingIds = new Set(pending.map((p) => p.id));
            const filteredServer = serverBudgets.filter(
              (sb) => !pendingIds.has(sb.id),
            );
            return { budgets: [...pending, ...filteredServer] };
          });
        } catch (err: any) {
          console.warn('Error fetching budgets:', err.message);
        } finally {
          set({ loading: false });
        }
      },

      createBudget: async (dto) => {
        const { supabase } = require('@/services/supabase/client');
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
        const { supabase } = require('@/services/supabase/client');
        const { data: userData } = await supabase.auth.getUser();

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let generatedCode = '';
        for (let i = 0; i < 6; i++) {
          generatedCode += chars.charAt(
            Math.floor(Math.random() * chars.length),
          );
        }

        const newBudgets: Budget[] = dto.categories.map((cat) => ({
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
          inviteCode: generatedCode,
        }));

        set((state) => ({ budgets: [...newBudgets, ...state.budgets] }));
        syncEmitter.emit();
        return newBudgets;
      },

      updateBudget: async (id, dto) => {
        set((state) => ({
          budgets: state.budgets.map((b) => {
            if (b.id === id) {
              const status =
                b.syncStatus === 'pending_insert'
                  ? 'pending_insert'
                  : 'pending_update';
              return {
                ...b,
                ...dto,
                updatedAt: new Date().toISOString(),
                syncStatus: status,
              } as Budget;
            }
            return b;
          }),
        }));
        syncEmitter.emit();
        return get().budgets.find((b) => b.id === id)!;
      },

      deleteBudget: async (id) => {
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, syncStatus: 'pending_delete' } : b,
          ),
        }));
        syncEmitter.emit();
      },

      deleteBudgetGroup: async (name) => {
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.name === name ? { ...b, syncStatus: 'pending_delete' } : b,
          ),
        }));
        syncEmitter.emit();
      },

      fetchInvites: async () => {
        try {
          const invites = await budgetService.fetchBudgetInvites();
          set({ invites });
        } catch (err: any) {
          console.warn('Error fetching invites:', err.message);
        }
      },

      fetchCollaborators: async (budgetName) => {
        try {
          const fresh = await budgetService.fetchBudgetCollaborators(budgetName);
          set((state) => {
            const otherCollabs = state.collaborators.filter(
              (c) => c.budgetName !== budgetName,
            );
            return { collaborators: [...otherCollabs, ...fresh] };
          });
        } catch (err: any) {
          console.warn('Error fetching collaborators:', err.message);
        }
      },

      inviteUser: async (budgetName, email) => {
        await budgetService.inviteUserToBudget(budgetName, email);
      },

      acceptInvite: async (budgetName, ownerId) => {
        await budgetService.acceptBudgetInvite(budgetName, ownerId);
        get().fetchInvites();
        get().fetchBudgets();
      },

      declineInvite: async (budgetName, ownerId) => {
        await budgetService.declineBudgetInvite(budgetName, ownerId);
        get().fetchInvites();
      },

      removeCollaborator: async (budgetName, ownerId, userId) => {
        await budgetService.removeBudgetMember(budgetName, ownerId, userId);
        get().fetchCollaborators(budgetName);
      },

      previewBudgetByCode: async (code) => {
        return budgetService.previewBudgetByCode(code);
      },

      joinBudgetByCode: async (code) => {
        await budgetService.joinBudgetByCode(code);
        get().fetchBudgets();
      },

      regenerateInviteCode: async (budgetName) => {
        const newCode = await budgetService.regenerateInviteCode(budgetName);
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.name === budgetName ? { ...b, inviteCode: newCode } : b,
          ),
        }));
        return newCode;
      },
    }),
    {
      name: 'budget-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
