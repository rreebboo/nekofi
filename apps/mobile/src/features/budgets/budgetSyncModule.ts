/**
 * budgetSyncModule.ts
 *
 * Self-contained sync module for the budgets feature.
 * Registers itself into the sync registry at app startup.
 */
import { registerSyncModule } from '@/services/sync/syncRegistry';
import { useBudgetStore } from '@/stores/budgetStore';
import * as budgetService from '@/services/budgetService';

export function initBudgetSyncModule(): void {
  registerSyncModule({
    name: 'budgets',
    // Priority 2: budgets must exist before transactions that reference budget_id.
    priority: 2,

    getPendingInserts: () =>
      useBudgetStore.getState().budgets.filter(
        (b) => b.syncStatus === 'pending_insert',
      ),

    getPendingUpdates: () =>
      useBudgetStore.getState().budgets.filter(
        (b) => b.syncStatus === 'pending_update',
      ),

    getPendingDeletes: () =>
      useBudgetStore.getState().budgets.filter(
        (b) => b.syncStatus === 'pending_delete',
      ),

    uploadInsert: async (budget, userId) => {
      await budgetService.upsertBudget(budget, userId);
      useBudgetStore.getState().updateSyncStatus(budget.id, 'synced');
    },

    uploadUpdate: async (budget, userId) => {
      await budgetService.updateBudget(budget, userId);
      useBudgetStore.getState().updateSyncStatus(budget.id, 'synced');
    },

    uploadDelete: async (budget, userId) => {
      await budgetService.deleteBudget(budget.id);
      useBudgetStore.getState().removeLocal(budget.id);
    },
  });
}
