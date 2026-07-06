/**
 * syncRegistry.ts
 *
 * Plugin-based sync registry. Feature modules register themselves here;
 * the sync engine iterates the registry without knowing about individual stores.
 *
 * Adding a new synced feature (Goals, Bills, Investments, etc.) only requires:
 *   1. Creating a sync module file (e.g. src/features/goals/goalsSyncModule.ts)
 *   2. Calling registerSyncModule() at app startup
 *   3. Never touching syncEngine.ts
 *
 * Priority controls sync ordering:
 *   1 = Accounts (must exist before transactions that may reference them)
 *   2 = Budgets  (must exist before transactions that may reference budget_id)
 *   3 = Transactions (leaf data; syncs last)
 *
 * Future features can use priority 4+ to sync after existing data.
 */

export interface SyncModule {
  /** Unique name used for logging and deduplication. */
  name: string;

  /**
   * Lower priority runs first. Use:
   *   1 = accounts (referenced by others)
   *   2 = budgets  (referenced by transactions)
   *   3 = transactions / leaf data
   *   4+ = future features
   */
  priority: number;

  /** Return all items pending insertion into the remote DB. */
  getPendingInserts: () => any[];
  /** Return all items pending update in the remote DB. */
  getPendingUpdates: () => any[];
  /** Return all items pending deletion from the remote DB. */
  getPendingDeletes: () => any[];

  /** Push a single pending-insert item to Supabase. */
  uploadInsert: (item: any, userId: string) => Promise<void>;
  /** Push a single pending-update item to Supabase. */
  uploadUpdate: (item: any, userId: string) => Promise<void>;
  /** Delete a single pending-delete item from Supabase. Marks local removal on success. */
  uploadDelete: (item: any, userId: string) => Promise<void>;
}

const registry = new Map<string, SyncModule>();

/**
 * Register a feature's sync module.
 * Safe to call multiple times with the same name (idempotent — last write wins).
 */
export function registerSyncModule(mod: SyncModule): void {
  registry.set(mod.name, mod);
}

/**
 * Deregister a sync module (useful for cleanup in tests).
 */
export function unregisterSyncModule(name: string): void {
  registry.delete(name);
}

/**
 * Returns all registered modules sorted by ascending priority.
 * The sync engine calls this at runtime so the list is always current.
 */
export function getSyncModules(): SyncModule[] {
  return [...registry.values()].sort((a, b) => a.priority - b.priority);
}

/**
 * Returns the names of all registered modules (useful for diagnostics).
 */
export function getRegisteredModuleNames(): string[] {
  return [...registry.keys()];
}
