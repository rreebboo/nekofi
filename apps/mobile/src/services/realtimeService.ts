import { supabase } from './supabase/client';
import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { RealtimeChannel } from '@supabase/supabase-js';

let realtimeChannel: RealtimeChannel | null = null;

export function initRealtimeSync() {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('nekofi_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'accounts' },
      (payload) => {
        useAccountStore.getState().handleRealtimeChange(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budgets' },
      (payload) => {
        useBudgetStore.getState().handleRealtimeChange(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions' },
      (payload) => {
        useTransactionStore.getState().handleRealtimeChange(payload);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'budget_members' },
      (payload) => {
        useBudgetStore.getState().handleMembersRealtimeChange();
      }
    )
    .subscribe((status) => {
      console.log('Realtime sync status:', status);
    });
}

export function stopRealtimeSync() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}
