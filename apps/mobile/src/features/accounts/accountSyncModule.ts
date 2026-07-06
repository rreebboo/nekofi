/**
 * accountSyncModule.ts
 *
 * Self-contained sync module for the accounts feature.
 * Registers itself into the sync registry so the sync engine can
 * discover and process it without any direct store imports in syncEngine.ts.
 *
 * To add this feature to the sync pipeline:
 *   Call initAccountSyncModule() once at app startup (in _layout.tsx).
 */
import { registerSyncModule } from '@/services/sync/syncRegistry';
import { useAccountStore } from '@/stores/accountStore';
import * as accountService from '@/services/accountService';

export function initAccountSyncModule(): void {
  registerSyncModule({
    name: 'accounts',
    // Priority 1: accounts must be created before budgets/transactions
    // that may reference account IDs.
    priority: 1,

    getPendingInserts: () =>
      useAccountStore.getState().accounts.filter(
        (a) => a.syncStatus === 'pending_insert',
      ),

    getPendingUpdates: () =>
      useAccountStore.getState().accounts.filter(
        (a) => a.syncStatus === 'pending_update',
      ),

    getPendingDeletes: () =>
      useAccountStore.getState().accounts.filter(
        (a) => a.syncStatus === 'pending_delete',
      ),

    uploadInsert: async (account, userId) => {
      await accountService.upsertAccount(account, userId);
      useAccountStore.getState().updateSyncStatus(account.id, 'synced');
    },

    uploadUpdate: async (account, userId) => {
      await accountService.updateAccount(account, userId);
      useAccountStore.getState().updateSyncStatus(account.id, 'synced');
    },

    uploadDelete: async (account, userId) => {
      await accountService.deleteAccount(account.id);
      useAccountStore.getState().removeLocal(account.id);
    },
  });
}
