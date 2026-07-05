/**
 * AIPermissionGuard
 *
 * Validates that the current user has the right to perform AI-requested
 * operations. Works as a client-side safety net on top of Supabase RLS.
 *
 * Classification:
 *  - READ    → always allowed for authenticated users
 *  - WRITE   → allowed for authenticated users (create/update)
 *  - DELETE  → requires explicit user confirmation before execution
 *  - DENIED  → guest users attempting mutations
 */

export type OperationLevel = 'read' | 'write' | 'destructive';

export interface PermissionResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
}

// Maps each AI tool name to its operation level
const TOOL_OPERATION_MAP: Record<string, OperationLevel> = {
  // Read operations
  get_transactions: 'read',
  get_transaction_summary: 'read',
  get_budgets: 'read',
  get_budget_detail: 'read',
  get_accounts: 'read',
  get_spending_insights: 'read',
  get_profile: 'read',

  // Write operations
  create_transaction: 'write',
  create_budget: 'write',
  update_budget: 'write',
  update_settings: 'write',

  // Destructive operations
  delete_transaction: 'destructive',
  delete_budget: 'destructive',
};

/**
 * Check whether the current user is allowed to execute a given AI tool.
 */
export function checkPermission(
  toolName: string,
  isAuthenticated: boolean,
  isGuest: boolean,
): PermissionResult {
  const level = TOOL_OPERATION_MAP[toolName];

  // Unknown tool → block
  if (!level) {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `Unknown tool "${toolName}". Operation blocked for safety.`,
    };
  }

  // Guest users: read-only access to local data
  if (isGuest || !isAuthenticated) {
    if (level === 'read') {
      return { allowed: true, requiresConfirmation: false };
    }
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: 'You need to sign in to perform this action. Guest users have read-only access.',
    };
  }

  // Authenticated users
  if (level === 'destructive') {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: 'This action will permanently modify your data. Please confirm.',
    };
  }

  return { allowed: true, requiresConfirmation: false };
}

/**
 * Returns the operation level for a given tool name.
 */
export function getOperationLevel(toolName: string): OperationLevel | undefined {
  return TOOL_OPERATION_MAP[toolName];
}
