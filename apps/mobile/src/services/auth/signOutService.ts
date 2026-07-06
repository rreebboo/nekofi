/**
 * signOutService.ts
 *
 * Coordinates the full sign-out flow across all feature stores.
 *
 * WHY THIS EXISTS
 * ---------------
 * authStore.signOut() previously used dynamic `require()` calls to import
 * accountStore, budgetStore, and transactionStore at runtime, bypassing
 * circular-dependency detection and TypeScript type-checking.
 *
 * The circular dependency existed because:
 *   stores/authStore.ts  imports  services/auth/*
 *   stores/accountStore.ts  imports  services/syncEmitter.ts
 *   → authStore could not statically import accountStore
 *
 * This service sits in the services/ layer, which CAN import from stores/
 * (services → stores is a valid one-way dependency):
 *
 *   app init → authStore.signOut() → signOutService (this file)
 *            ↓ imports ↓
 *   stores/accountStore, budgetStore, transactionStore (safe, no cycle)
 */
import { supabase } from '@/services/supabase/client';
import { signOutFromGoogle } from '@/services/auth/googleAuth';
import { useAccountStore } from '@/stores/accountStore';
import { useBudgetStore } from '@/stores/budgetStore';
import { useTransactionStore } from '@/stores/transactionStore';

/**
 * Perform a full sign-out:
 * 1. Sign out from Supabase
 * 2. Clear the native Google sign-in state
 * 3. Clear all feature store data
 *
 * authStore.signOut() calls this function, then updates its own state.
 */
export async function performSignOut(): Promise<void> {
  // Sign out from Supabase (invalidates session tokens)
  await supabase.auth.signOut();

  // Clear Google native sign-in state so the next login shows the account picker
  await signOutFromGoogle();

  // Clear all local feature store data — order doesn't matter for clearing
  useAccountStore.getState().clearAccounts();
  useBudgetStore.getState().clearBudgets();
  useTransactionStore.getState().clearTransactions();
}
