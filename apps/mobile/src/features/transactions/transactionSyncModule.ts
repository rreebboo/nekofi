/**
 * transactionSyncModule.ts
 *
 * Self-contained sync module for the transactions feature.
 * Registers itself into the sync registry at app startup.
 */
import { registerSyncModule } from '@/services/sync/syncRegistry';
import { useTransactionStore } from '@/stores/transactionStore';
import * as transactionService from '@/services/transactionService';

export function initTransactionSyncModule(): void {
  registerSyncModule({
    name: 'transactions',
    // Priority 3: transactions are leaf data, sync after accounts and budgets.
    priority: 3,

    getPendingInserts: () =>
      useTransactionStore.getState().transactions.filter(
        (t) => t.syncStatus === 'pending_insert',
      ),

    getPendingUpdates: () =>
      useTransactionStore.getState().transactions.filter(
        (t) => t.syncStatus === 'pending_update',
      ),

    getPendingDeletes: () =>
      useTransactionStore.getState().transactions.filter(
        (t) => t.syncStatus === 'pending_delete',
      ),

    uploadInsert: async (tx, userId) => {
      await transactionService.upsertTransaction(tx, userId);
      useTransactionStore.getState().updateSyncStatus(tx.id, 'synced');
    },

    uploadUpdate: async (tx, userId) => {
      await transactionService.updateTransaction(tx, userId);
      useTransactionStore.getState().updateSyncStatus(tx.id, 'synced');
    },

    uploadDelete: async (tx, userId) => {
      await transactionService.deleteTransaction(tx.id);
      useTransactionStore.getState().removeLocal(tx.id);
    },
  });
}
