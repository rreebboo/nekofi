import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { syncEmitter } from './syncEmitter';

let isProcessing = false;

export async function processSyncQueue() {
  if (isProcessing) return;
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  isProcessing = true;
  try {
    const userId = userData.user.id;

    // 1. Process Accounts
    const accountStore = useAccountStore.getState();
    const pendingAccounts = accountStore.accounts.filter(a => a.syncStatus === 'pending_insert');
    for (const a of pendingAccounts) {
      const { error } = await supabase.from('accounts').insert({
        id: a.id,
        user_id: userId,
        name: a.name,
        type: a.type,
        brand_icon: a.brandIcon,
        balance: a.balance,
        currency: a.currency,
        color: a.color,
        gradient_end: a.gradientEnd,
        text_color: a.textColor,
        number_masked: a.numberMasked,
      });
      if (!error) accountStore.updateSyncStatus(a.id, 'synced');
    }
    const updateAccounts = accountStore.accounts.filter(a => a.syncStatus === 'pending_update');
    for (const a of updateAccounts) {
      const { error } = await supabase.from('accounts').update({
        name: a.name, type: a.type, brand_icon: a.brandIcon, balance: a.balance,
        currency: a.currency, color: a.color, gradient_end: a.gradientEnd,
        text_color: a.textColor, number_masked: a.numberMasked
      }).eq('id', a.id);
      if (!error) accountStore.updateSyncStatus(a.id, 'synced');
    }
    const deleteAccounts = accountStore.accounts.filter(a => a.syncStatus === 'pending_delete');
    for (const a of deleteAccounts) {
      const { error } = await supabase.from('accounts').delete().eq('id', a.id);
      if (!error || error.code === 'PGRST116') { // success or not found
        accountStore.removeLocal(a.id);
      }
    }

    // 2. Process Budgets
    const budgetStore = useBudgetStore.getState();
    const pendingBudgets = budgetStore.budgets.filter(b => b.syncStatus === 'pending_insert');
    for (const b of pendingBudgets) {
      const { error } = await supabase.from('budgets').insert({
        id: b.id,
        user_id: userId,
        name: b.name,
        category: b.category,
        amount: b.amount,
        currency: b.currency,
        period: b.period,
        start_date: b.startDate,
        color: b.color,
        emoji: b.emoji,
      });
      if (!error) budgetStore.updateSyncStatus(b.id, 'synced');
    }
    const updateBudgets = budgetStore.budgets.filter(b => b.syncStatus === 'pending_update');
    for (const b of updateBudgets) {
      const { error } = await supabase.from('budgets').update({
        name: b.name, category: b.category, amount: b.amount, currency: b.currency,
        period: b.period, start_date: b.startDate, color: b.color, emoji: b.emoji
      }).eq('id', b.id);
      if (!error) budgetStore.updateSyncStatus(b.id, 'synced');
    }
    const deleteBudgets = budgetStore.budgets.filter(b => b.syncStatus === 'pending_delete');
    for (const b of deleteBudgets) {
      const { error } = await supabase.from('budgets').delete().eq('id', b.id);
      if (!error || error.code === 'PGRST116') budgetStore.removeLocal(b.id);
    }

    // 3. Process Transactions
    const txStore = useTransactionStore.getState();
    const pendingTxs = txStore.transactions.filter(t => t.syncStatus === 'pending_insert');
    for (const t of pendingTxs) {
      const { error } = await supabase.from('transactions').insert({
        id: t.id,
        user_id: userId,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        category: t.category,
        description: t.description,
        date: t.date,
        receipt_url: t.receiptUrl,
        budget_id: t.budgetId,
      });
      if (!error) txStore.updateSyncStatus(t.id, 'synced');
    }
    const updateTxs = txStore.transactions.filter(t => t.syncStatus === 'pending_update');
    for (const t of updateTxs) {
      const { error } = await supabase.from('transactions').update({
        type: t.type, amount: t.amount, currency: t.currency, category: t.category,
        description: t.description, date: t.date, receipt_url: t.receiptUrl, budget_id: t.budgetId
      }).eq('id', t.id);
      if (!error) txStore.updateSyncStatus(t.id, 'synced');
    }
    const deleteTxs = txStore.transactions.filter(t => t.syncStatus === 'pending_delete');
    for (const t of deleteTxs) {
      const { error } = await supabase.from('transactions').delete().eq('id', t.id);
      if (!error || error.code === 'PGRST116') txStore.removeLocal(t.id);
    }

  } catch (err) {
    console.warn('Sync engine error:', err);
  } finally {
    isProcessing = false;
  }
}

export function initSyncEngine() {
  syncEmitter.subscribe(() => {
    processSyncQueue();
  });

  NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      processSyncQueue();
    }
  });
}
