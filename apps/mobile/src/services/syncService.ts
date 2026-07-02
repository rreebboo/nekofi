import { supabase } from './supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useAuthStore } from '@/stores/authStore';
import { syncEmitter } from './syncEmitter';

export async function checkAndHandleSyncConflict(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

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
    const [oldAccounts, oldBudgets, oldTxs] = await Promise.all([
      supabase.from('accounts').select('id').eq('user_id', userData.user.id),
      supabase.from('budgets').select('id').eq('user_id', userData.user.id),
      supabase.from('transactions').select('id').eq('user_id', userData.user.id),
    ]);

    // 2. Format local data for upsert
    const accounts = useAccountStore.getState().accounts;
    const budgets = useBudgetStore.getState().budgets;
    const transactions = useTransactionStore.getState().transactions;

    const localAccounts = accounts.map(a => ({
      id: a.id, user_id: userData.user.id, name: a.name, type: a.type,
      brand_icon: a.brandIcon, balance: a.balance, currency: a.currency,
      color: a.color, gradient_end: a.gradientEnd, text_color: a.textColor,
      number_masked: a.numberMasked,
    }));
    
    const localBudgets = budgets.map(b => ({
      id: b.id, user_id: userData.user.id, name: b.name, category: b.category,
      amount: b.amount, currency: b.currency, period: b.period,
      start_date: b.startDate, color: b.color, emoji: b.emoji,
    }));

    const localTxs = transactions.map(t => {
      const payload: any = {
        id: t.id, user_id: userData.user.id, type: t.type, amount: t.amount,
        currency: t.currency, category: t.category, description: t.description,
        date: t.date, receipt_url: t.receiptUrl,
      };
      if (t.budgetId) payload.budget_id = t.budgetId;
      return payload;
    });

    // 3. Upsert
    const [upAcc, upBud, upTx] = await Promise.all([
      localAccounts.length ? supabase.from('accounts').upsert(localAccounts) : Promise.resolve({ error: null }),
      localBudgets.length ? supabase.from('budgets').upsert(localBudgets) : Promise.resolve({ error: null }),
      localTxs.length ? supabase.from('transactions').upsert(localTxs) : Promise.resolve({ error: null }),
    ]);

    if (upAcc.error || upBud.error || upTx.error) {
      console.error('Failed to upload local data:', upAcc.error, upBud.error, upTx.error);
      throw new Error('Failed to upload local data to the cloud.');
    }

    // 4. Delete old cloud data
    const oldAccIds = oldAccounts.data?.map(a => a.id) || [];
    const oldBudIds = oldBudgets.data?.map(b => b.id) || [];
    const oldTxIds = oldTxs.data?.map(t => t.id) || [];

    await Promise.all([
      oldAccIds.length ? supabase.from('accounts').delete().in('id', oldAccIds) : Promise.resolve(),
      oldBudIds.length ? supabase.from('budgets').delete().in('id', oldBudIds) : Promise.resolve(),
      oldTxIds.length ? supabase.from('transactions').delete().in('id', oldTxIds) : Promise.resolve(),
    ]);

    // 5. Update local store sync status directly to 'synced'
    accounts.forEach(a => useAccountStore.getState().updateSyncStatus(a.id, 'synced'));
    budgets.forEach(b => useBudgetStore.getState().updateSyncStatus(b.id, 'synced'));
    transactions.forEach(t => useTransactionStore.getState().updateSyncStatus(t.id, 'synced'));
  }

  useAuthStore.getState().setSyncConflict(false);
}
