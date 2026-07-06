/**
 * budgetService.ts
 *
 * Pure Supabase I/O for the budgets feature.
 * No Zustand imports — plain async functions that return typed data.
 *
 * Separation of concerns:
 *   stores/budgetStore.ts  → state management, UI mutations, offline queue
 *   services/budgetService.ts → Supabase queries, data mapping (this file)
 */
import { supabase } from './supabase/client';
import type {
  Budget,
  CreateBudgetDto,
  BudgetInvite,
  BudgetCollaborator,
  BudgetPreview,
} from '@/types/budget';

// ─── Data mappers ────────────────────────────────────────────────────────────

export const mapToCamel = (item: any): Budget => ({
  id: item.id,
  userId: item.user_id,
  name: item.name,
  category: item.category,
  amount: Number(item.amount),
  spent: Number(item.spent || 0),
  currency: item.currency,
  period: item.period,
  startDate: item.start_date,
  endDate: item.end_date,
  color: item.color,
  emoji: item.emoji,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  syncStatus: 'synced',
  inviteCode: item.invite_code,
});

export const mapToInviteCamel = (item: any): BudgetInvite => ({
  budgetName: item.budget_name,
  ownerId: item.owner_id,
  ownerName: item.owner_name,
  ownerAvatarUrl: item.owner_avatar_url,
  inviteeId: item.invitee_id,
  invitedAt: item.invited_at,
});

export const mapToCollaboratorCamel = (item: any): BudgetCollaborator => ({
  budgetName: item.budget_name,
  ownerId: item.owner_id,
  collaboratorId: item.collaborator_id,
  collaboratorName: item.collaborator_name,
  collaboratorAvatarUrl: item.collaborator_avatar_url,
  status: item.status,
});

// ─── Read ────────────────────────────────────────────────────────────────────

export async function fetchBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase.from('budgets').select('*');
  if (error) throw error;
  return (data ?? []).map(mapToCamel);
}

export async function hasCloudBudgets(): Promise<boolean> {
  const { data } = await supabase.from('budgets').select('id').limit(1);
  return (data?.length ?? 0) > 0;
}

export async function fetchBudgetInvites(): Promise<BudgetInvite[]> {
  const { data, error } = await supabase
    .from('pending_budget_invites')
    .select('*');
  if (error) throw error;
  return (data ?? []).map(mapToInviteCamel);
}

export async function fetchBudgetCollaborators(
  budgetName: string,
): Promise<BudgetCollaborator[]> {
  const { data, error } = await supabase
    .from('budget_collaborators')
    .select('*')
    .eq('budget_name', budgetName);
  if (error) throw error;
  return (data ?? []).map(mapToCollaboratorCamel);
}

export async function previewBudgetByCode(
  code: string,
): Promise<BudgetPreview | null> {
  const { data, error } = await supabase.rpc('preview_budget_by_code', {
    p_invite_code: code,
  });
  if (error) throw error;
  if (data && data.length > 0) {
    return {
      budgetName: data[0].budget_name,
      ownerName: data[0].owner_name,
      ownerAvatarUrl: data[0].owner_avatar_url,
    };
  }
  return null;
}

export async function fetchBudgetIdsByUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function upsertBudget(
  budget: Budget,
  userId: string,
): Promise<void> {
  const payload: any = {
    id: budget.id,
    user_id: userId,
    name: budget.name,
    category: budget.category,
    amount: budget.amount,
    currency: budget.currency,
    period: budget.period,
    start_date: budget.startDate,
    color: budget.color,
    emoji: budget.emoji,
    invite_code: budget.inviteCode,
  };
  const { error } = await supabase.from('budgets').upsert(payload);
  if (error) throw error;
}

export async function updateBudget(
  budget: Budget,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .update({
      name: budget.name,
      category: budget.category,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
      start_date: budget.startDate,
      color: budget.color,
      emoji: budget.emoji,
      invite_code: budget.inviteCode,
    })
    .eq('id', budget.id);
  if (error) throw error;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error && error.code !== 'PGRST116') throw error;
}

export async function batchUpsertBudgets(
  budgets: Budget[],
  userId: string,
): Promise<void> {
  if (budgets.length === 0) return;
  const rows = budgets.map((b) => ({
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
  }));
  const { error } = await supabase.from('budgets').upsert(rows);
  if (error) throw error;
}

export async function deleteBudgetsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('budgets').delete().in('id', ids);
  if (error) throw error;
}

// ─── Collaboration RPCs ──────────────────────────────────────────────────────

export async function inviteUserToBudget(
  budgetName: string,
  email: string,
): Promise<void> {
  const { error } = await supabase.rpc('invite_user_to_budget', {
    p_budget_name: budgetName,
    p_email: email,
  });
  if (error) throw error;
}

export async function acceptBudgetInvite(
  budgetName: string,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase.rpc('accept_budget_invite', {
    p_budget_name: budgetName,
    p_owner_id: ownerId,
  });
  if (error) throw error;
}

export async function declineBudgetInvite(
  budgetName: string,
  ownerId: string,
): Promise<void> {
  const { error } = await supabase.rpc('decline_budget_invite', {
    p_budget_name: budgetName,
    p_owner_id: ownerId,
  });
  if (error) throw error;
}

export async function removeBudgetMember(
  budgetName: string,
  ownerId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('remove_budget_member', {
    p_budget_name: budgetName,
    p_owner_id: ownerId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function joinBudgetByCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('join_budget_by_code', {
    p_invite_code: code,
  });
  if (error) throw error;
}

export async function regenerateInviteCode(budgetName: string): Promise<string> {
  const { data, error } = await supabase.rpc(
    'regenerate_budget_invite_code',
    { p_budget_name: budgetName },
  );
  if (error) throw error;
  return data as string;
}
