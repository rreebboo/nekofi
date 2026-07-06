/**
 * transactionService.ts
 *
 * Pure Supabase I/O for the transactions feature.
 * No Zustand imports — plain async functions that return typed data.
 *
 * Separation of concerns:
 *   stores/transactionStore.ts  → state management, binary-search inserts, offline queue
 *   services/transactionService.ts → Supabase queries, data mapping (this file)
 */
import { supabase } from './supabase/client';
import type { Transaction, CreateTransactionDto } from '@/types/transaction';

// ─── Data mapper ─────────────────────────────────────────────────────────────

/**
 * Map a raw Supabase row (snake_case) to the app's Transaction type (camelCase).
 * Exported so syncService / syncModules can reuse it.
 */
export const mapToCamelTx = (item: any): Transaction => ({
  id: item.id,
  userId: item.user_id,
  type: item.type,
  amount: Number(item.amount),
  currency: item.currency,
  category: item.category,
  description: item.description,
  date: item.date,
  receiptUrl: item.receipt_url,
  budgetId: item.budget_id,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  syncStatus: 'synced',
});

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Fetch transactions with optional limit.
 * When no limit is supplied, pages through all records in 1 000-row chunks.
 */
export async function fetchTransactions(params: {
  limit?: number;
} = {}): Promise<Transaction[]> {
  if (params.limit) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(params.limit);
    if (error) throw error;
    return (data ?? []).map(mapToCamelTx);
  }

  // Full paginated fetch
  let all: Transaction[] = [];
  let offset = 0;
  const PAGE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      all.push(...data.map(mapToCamelTx));
      hasMore = data.length === PAGE;
      offset += PAGE;
    } else {
      hasMore = false;
    }
  }

  return all;
}

export async function hasCloudTransactions(): Promise<boolean> {
  const { data } = await supabase
    .from('transactions')
    .select('id')
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function fetchTransactionIdsByUser(
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function upsertTransaction(
  tx: Transaction,
  userId: string,
): Promise<void> {
  const payload: any = {
    id: tx.id,
    user_id: userId,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    category: tx.category,
    description: tx.description,
    date: tx.date,
    receipt_url: tx.receiptUrl,
  };
  if (tx.budgetId) payload.budget_id = tx.budgetId;
  const { error } = await supabase.from('transactions').upsert(payload);
  if (error) throw error;
}

export async function updateTransaction(
  tx: Transaction,
  userId: string,
): Promise<void> {
  const payload: any = {
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    category: tx.category,
    description: tx.description,
    date: tx.date,
    receipt_url: tx.receiptUrl,
  };
  if (tx.budgetId) payload.budget_id = tx.budgetId;
  const { error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', tx.id);
  if (error) throw error;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  if (error && error.code !== 'PGRST116') throw error;
}

export async function batchUpsertTransactions(
  transactions: Transaction[],
  userId: string,
): Promise<void> {
  if (transactions.length === 0) return;
  const rows = transactions.map((t) => {
    const row: any = {
      id: t.id,
      user_id: userId,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      description: t.description,
      date: t.date,
      receipt_url: t.receiptUrl,
    };
    if (t.budgetId) row.budget_id = t.budgetId;
    return row;
  });
  const { error } = await supabase.from('transactions').upsert(rows);
  if (error) throw error;
}

export async function deleteTransactionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', ids);
  if (error) throw error;
}
