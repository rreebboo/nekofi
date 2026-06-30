import { supabase } from './supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useAuthStore } from '@/stores/authStore';
import { syncEmitter } from './syncEmitter';

export async function checkAndHandleSyncConflict() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const accounts = useAccountStore.getState().accounts;
  const budgets = useBudgetStore.getState().budgets;
  const transactions = useTransactionStore.getState().transactions;

  const hasLocalData = accounts.length > 0 || budgets.length > 0 || transactions.length > 0;

  // Check if cloud data exists
  const [cloudAccounts, cloudBudgets, cloudTxs] = await Promise.all([
    supabase.from('accounts').select('id').limit(1),
    supabase.from('budgets').select('id').limit(1),
    supabase.from('transactions').select('id').limit(1),
  ]);

  const hasCloudData = (cloudAccounts.data && cloudAccounts.data.length > 0) ||
                       (cloudBudgets.data && cloudBudgets.data.length > 0) ||
                       (cloudTxs.data && cloudTxs.data.length > 0);

  if (hasLocalData && hasCloudData) {
    useAuthStore.getState().setSyncConflict(true);
  } else if (hasLocalData && !hasCloudData) {
    // Upload local to cloud implicitly
    await resolveSyncChoice('local');
  } else if (!hasLocalData && hasCloudData) {
    // Download cloud to local implicitly
    await resolveSyncChoice('cloud');
  }
}

export async function resolveSyncChoice(choice: 'local' | 'cloud') {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

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
    // Overwrite cloud data with local data
    // First delete all cloud data for user
    await Promise.all([
      supabase.from('accounts').delete().eq('user_id', userData.user.id),
      supabase.from('budgets').delete().eq('user_id', userData.user.id),
      supabase.from('transactions').delete().eq('user_id', userData.user.id),
    ]);

    // Tag local data for upload
    const accounts = useAccountStore.getState().accounts;
    const budgets = useBudgetStore.getState().budgets;
    const transactions = useTransactionStore.getState().transactions;

    accounts.forEach(a => useAccountStore.getState().updateSyncStatus(a.id, 'pending_insert'));
    budgets.forEach(b => useBudgetStore.getState().updateSyncStatus(b.id, 'pending_insert'));
    transactions.forEach(t => useTransactionStore.getState().updateSyncStatus(t.id, 'pending_insert'));

    syncEmitter.emit();
  }

  useAuthStore.getState().setSyncConflict(false);
}
