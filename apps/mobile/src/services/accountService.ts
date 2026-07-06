/**
 * accountService.ts
 *
 * Pure Supabase I/O for the accounts feature.
 * No Zustand imports — all functions are plain async functions that
 * return typed data. Stores consume these functions and own the state.
 *
 * Separation of concerns:
 *   stores/accountStore.ts  → state management, UI mutations, offline queue
 *   services/accountService.ts → Supabase queries, data mapping (this file)
 */
import { supabase } from './supabase/client';
import type { Account, CreateAccountDto, SyncStatus } from '@/types/account';

// ─── Data mapper ────────────────────────────────────────────────────────────

/**
 * Map a raw Supabase row (snake_case) to the app's Account type (camelCase).
 * Exported so syncService / syncModules can reuse it without re-importing.
 */
export const mapToCamelAccount = (item: any): Account => ({
  id: item.id,
  name: item.name,
  type: item.type,
  brandIcon: item.brand_icon,
  balance: Number(item.balance),
  currency: item.currency,
  color: item.color,
  gradientEnd: item.gradient_end,
  textColor: item.text_color,
  numberMasked: item.number_masked,
  createdAt: item.created_at,
  syncStatus: 'synced',
});

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all accounts for the authenticated user.
 * Returns an empty array (not throw) if the query returns no data.
 */
export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*');
  if (error) throw error;
  return (data ?? []).map(mapToCamelAccount);
}

/** Check whether any account rows exist in the cloud (used by syncService). */
export async function hasCloudAccounts(): Promise<boolean> {
  const { data } = await supabase.from('accounts').select('id').limit(1);
  return (data?.length ?? 0) > 0;
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function upsertAccount(
  account: Account,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('accounts').upsert({
    id: account.id,
    user_id: userId,
    name: account.name,
    type: account.type,
    brand_icon: account.brandIcon,
    balance: account.balance,
    currency: account.currency,
    color: account.color,
    gradient_end: account.gradientEnd,
    text_color: account.textColor,
    number_masked: account.numberMasked,
  });
  if (error) throw error;
}

export async function updateAccount(
  account: Account,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from('accounts').update({
    name: account.name,
    type: account.type,
    brand_icon: account.brandIcon,
    balance: account.balance,
    currency: account.currency,
    color: account.color,
    gradient_end: account.gradientEnd,
    text_color: account.textColor,
    number_masked: account.numberMasked,
  }).eq('id', account.id);
  if (error) throw error;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  // PGRST116 = "no rows" — already deleted, treat as success
  if (error && error.code !== 'PGRST116') throw error;
}

/**
 * Batch upsert for sync-conflict resolution (local → cloud upload).
 */
export async function batchUpsertAccounts(
  accounts: Account[],
  userId: string,
): Promise<void> {
  if (accounts.length === 0) return;
  const rows = accounts.map((a) => ({
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
  }));
  const { error } = await supabase.from('accounts').upsert(rows);
  if (error) throw error;
}

export async function deleteAccountsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('accounts').delete().in('id', ids);
  if (error) throw error;
}

export async function fetchAccountIdsByUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}
