/**
 * sync/syncEngine.ts
 *
 * Registry-driven sync engine.
 *
 * This file has ZERO imports of feature stores (accountStore, budgetStore,
 * transactionStore). It only knows about:
 *   - The sync registry (getSyncModules)
 *   - NetInfo (connectivity check)
 *   - The Supabase auth client (user identity)
 *   - The syncEmitter (trigger mechanism)
 *
 * Adding a new synced feature requires ONLY:
 *   1. Creating a sync module (e.g. src/features/goals/goalsSyncModule.ts)
 *   2. Calling registerSyncModule() at app startup (in _layout.tsx)
 *   This file remains untouched.
 */
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase/client';
import { getSyncModules } from './syncRegistry';
import { syncEmitter } from '../syncEmitter';

let isProcessing = false;
let pendingRun = false;

// ─── Event-loop helpers ──────────────────────────────────────────────────────

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Process `items` with at most `concurrency` simultaneous in-flight requests.
 * Errors on individual items are caught and logged — they don't abort the batch.
 */
async function withConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(
      batch.map((item) =>
        fn(item).catch((err) =>
          console.warn('[SyncEngine] batch item error:', err),
        ),
      ),
    );
    await yieldToEventLoop();
  }
}

// ─── Core sync loop ──────────────────────────────────────────────────────────

export async function processSyncQueue(): Promise<void> {
  // Lazy-require to avoid circular deps (authStore → syncEmitter → syncEngine)
  const { useAuthStore } = require('@/stores/authStore');
  const authState = useAuthStore.getState();
  if (authState.syncConflict || authState.isCheckingConflict) return;

  if (isProcessing) {
    pendingRun = true;
    return;
  }

  isProcessing = true;

  do {
    pendingRun = false;
    try {
      // 1. Network check
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) continue;

      // 2. Auth check
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) continue;

      // 3. Conflict guard (re-check in case state changed during await)
      const loopAuthState = useAuthStore.getState();
      if (loopAuthState.syncConflict || loopAuthState.isCheckingConflict) {
        pendingRun = false;
        continue;
      }

      const userId = userData.user.id;

      // 4. Iterate all registered modules in priority order
      const modules = getSyncModules();
      for (const mod of modules) {
        // Inserts
        const inserts = mod.getPendingInserts();
        await withConcurrency(inserts, 5, (item) =>
          mod.uploadInsert(item, userId).catch((err) =>
            console.error(`[SyncEngine][${mod.name}] insert error:`, err),
          ),
        );

        // Updates
        const updates = mod.getPendingUpdates();
        await withConcurrency(updates, 5, (item) =>
          mod.uploadUpdate(item, userId).catch((err) =>
            console.error(`[SyncEngine][${mod.name}] update error:`, err),
          ),
        );

        // Deletes
        const deletes = mod.getPendingDeletes();
        await withConcurrency(deletes, 5, (item) =>
          mod.uploadDelete(item, userId).catch((err) =>
            console.error(`[SyncEngine][${mod.name}] delete error:`, err),
          ),
        );

        // Yield between modules to keep UI responsive
        await yieldToEventLoop();
      }
    } catch (err) {
      console.warn('[SyncEngine] Unexpected error:', err);
    }
  } while (pendingRun);

  isProcessing = false;
}

export function initSyncEngine(): void {
  syncEmitter.subscribe(() => {
    processSyncQueue();
  });

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      processSyncQueue();
    }
  });
}
