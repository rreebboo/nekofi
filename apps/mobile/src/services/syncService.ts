import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useAuthStore } from '@/stores/authStore';
import * as accountService from '@/services/accountService';
import * as budgetService from '@/services/budgetService';
import * as transactionService from '@/services/transactionService';
import { supabase } from '@/services/supabase/client';

export async function checkAndHandleSyncConflict(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const accounts = useAccountStore.getState().accounts;
  const budgets = useBudgetStore.getState().budgets;
  const transactions = useTransactionStore.getState().transactions;

  const hasLocalData = accounts.length > 0 || budgets.length > 0 || transactions.length > 0;

  // Check if cloud data exists
  const [hasAccounts, hasBudgets, hasTxs] = await Promise.all([
    accountService.hasCloudAccounts(),
    budgetService.hasCloudBudgets(),
    transactionService.hasCloudTransactions(),
  ]);

  const hasCloudData = hasAccounts || hasBudgets || hasTxs;

  if (hasLocalData && hasCloudData) {
    useAuthStore.getState().setSyncConflict(true);
    return true;
  } else if (hasLocalData && !hasCloudData) {
    // Upload local to cloud implicitly
    await resolveSyncChoice('local');
  } else if (!hasLocalData && hasCloudData) {
    // Download cloud to local implicitly
    await resolveSyncChoice('cloud');
  }

  return false;
}

export async function resolveSyncChoice(choice: 'local' | 'cloud') {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const userId = userData.user.id;

  if (choice === 'cloud') {
    // Clear local data, fetch from cloud
    useAccountStore.getState().clearAccounts();
    useBudgetStore.getState().clearBudgets();
    useTransactionStore.getState().clearTransactions();

    await Promise.all([
      useAccountStore.getState().fetchAccounts(),
      useBudgetStore.getState().fetchBudgets(),
      useTransactionStore.getState().fetchTransactions(),
    ]);
  } else if (choice === 'local') {
    // 1. Fetch old cloud IDs
    const [oldAccIds, oldBudIds, oldTxIds] = await Promise.all([
      accountService.fetchAccountIdsByUser(userId),
      budgetService.fetchBudgetIdsByUser(userId),
      transactionService.fetchTransactionIdsByUser(userId),
    ]);

    // 2. Format local data for upsert
    const accounts = useAccountStore.getState().accounts;
    const budgets = useBudgetStore.getState().budgets;
    const transactions = useTransactionStore.getState().transactions;

    // 3. Upsert
    await Promise.all([
      accountService.batchUpsertAccounts(accounts, userId),
      budgetService.batchUpsertBudgets(budgets, userId),
      transactionService.batchUpsertTransactions(transactions, userId),
    ]);

    // 4. Delete old cloud data
    await Promise.all([
      accountService.deleteAccountsByIds(oldAccIds),
      budgetService.deleteBudgetsByIds(oldBudIds),
      transactionService.deleteTransactionsByIds(oldTxIds),
    ]);

    // 5. Update local store sync status directly to 'synced'
    accounts.forEach(a => useAccountStore.getState().updateSyncStatus(a.id, 'synced'));
    budgets.forEach(b => useBudgetStore.getState().updateSyncStatus(b.id, 'synced'));
    transactions.forEach(t => useTransactionStore.getState().updateSyncStatus(t.id, 'synced'));
  }

  useAuthStore.getState().setSyncConflict(false);
}
