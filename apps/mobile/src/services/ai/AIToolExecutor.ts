/**
 * AIToolExecutor
 *
 * Executes AI tool calls by mapping them to Zustand store actions and
 * Supabase queries. Returns structured results back to the orchestrator.
 *
 * Security:
 * - Permission checks via AIPermissionGuard before every execution
 * - Destructive operations return a confirmation request instead of executing
 * - All data access respects RLS via the existing authenticated Supabase client
 */

import { useAuthStore } from '@/stores/authStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useAccountStore } from '@/stores/accountStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { checkPermission } from './AIPermissionGuard';
import { findTool } from './AIToolDefinitions';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, DEFAULT_CURRENCY } from '@/constants/categories';
import type { CreateTransactionDto } from '@/types/transaction';

export interface ToolCall {
  tool: string;
  params: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  message: string;
  requiresConfirmation?: boolean;
  confirmationDetails?: {
    toolName: string;
    params: Record<string, any>;
    description: string;
  };
}

function getCategoryLabel(id: string): string {
  const expense = EXPENSE_CATEGORIES.find(c => c.id === id);
  if (expense) return expense.label;
  const income = INCOME_CATEGORIES.find(c => c.id === id);
  if (income) return income.label;
  return id;
}

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'this_week': {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(0); // all time
  }

  return { start, end };
}

/**
 * Execute a tool call and return the result.
 */
export async function executeTool(call: ToolCall): Promise<ToolResult> {
  // 1. Validate tool exists
  const toolDef = findTool(call.tool);
  if (!toolDef) {
    return { success: false, message: `Unknown tool "${call.tool}".` };
  }

  // 2. Check permissions
  const authState = useAuthStore.getState();
  const isAuthenticated = !!authState.session && !!authState.user;
  const permission = checkPermission(call.tool, isAuthenticated, authState.isGuest);

  if (!permission.allowed) {
    return { success: false, message: permission.reason || 'Operation not permitted.' };
  }

  if (permission.requiresConfirmation) {
    return {
      success: true,
      requiresConfirmation: true,
      message: permission.reason || 'This action requires your confirmation.',
      confirmationDetails: {
        toolName: call.tool,
        params: call.params,
        description: buildConfirmationDescription(call),
      },
    };
  }

  // 3. Execute the tool
  try {
    return await executeToolInternal(call);
  } catch (error: any) {
    return { success: false, message: `Error executing ${call.tool}: ${error.message}` };
  }
}

/**
 * Execute a tool call that has already been confirmed by the user.
 * Skips permission/confirmation checks.
 */
export async function executeConfirmedTool(call: ToolCall): Promise<ToolResult> {
  try {
    return await executeToolInternal(call);
  } catch (error: any) {
    return { success: false, message: `Error executing ${call.tool}: ${error.message}` };
  }
}

/**
 * Internal dispatch — executes the actual tool logic.
 */
async function executeToolInternal(call: ToolCall): Promise<ToolResult> {
  const { tool, params } = call;

  switch (tool) {
    case 'get_transactions':
      return handleGetTransactions(params);

    case 'get_transaction_summary':
      return handleGetTransactionSummary(params);

    case 'get_budgets':
      return handleGetBudgets();

    case 'get_budget_detail':
      return handleGetBudgetDetail(params);

    case 'get_accounts':
      return handleGetAccounts();

    case 'get_spending_insights':
      return handleGetSpendingInsights(params);

    case 'get_profile':
      return handleGetProfile();

    case 'create_transaction':
      return await handleCreateTransaction(params);

    case 'create_budget':
      return await handleCreateBudget(params);

    case 'update_budget':
      return await handleUpdateBudget(params);

    case 'update_settings':
      return handleUpdateSettings(params);

    case 'delete_transaction':
      return await handleDeleteTransaction(params);

    case 'delete_budget':
      return await handleDeleteBudget(params);

    default:
      return { success: false, message: `Tool "${tool}" is defined but has no handler.` };
  }
}

// ─── Tool Handlers ────────────────────────────────────────────

function handleGetTransactions(params: Record<string, any>): ToolResult {
  const txState = useTransactionStore.getState();
  let txs = txState.transactions.filter(t => t.syncStatus !== 'pending_delete');

  // Period filter
  if (params.period && params.period !== 'all') {
    const { start, end } = getDateRange(params.period);
    txs = txs.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }

  // Category filter
  if (params.category) {
    txs = txs.filter(t => t.category === params.category);
  }

  // Type filter
  if (params.type) {
    txs = txs.filter(t => t.type === params.type);
  }

  // Limit
  const limit = params.limit || 10;
  txs = txs.slice(0, limit);

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  const formatted = txs.map(t => ({
    id: t.id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    category: getCategoryLabel(t.category),
    categoryId: t.category,
    description: t.description,
  }));

  return {
    success: true,
    data: formatted,
    message: `Found ${formatted.length} transaction(s).`,
  };
}

function handleGetTransactionSummary(params: Record<string, any>): ToolResult {
  const txState = useTransactionStore.getState();
  const activeTxs = txState.transactions.filter(t => t.syncStatus !== 'pending_delete');
  const { start, end } = getDateRange(params.period || 'this_month');

  const periodTxs = activeTxs.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });

  const totalIncome = periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  return {
    success: true,
    data: {
      period: params.period,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: periodTxs.length,
      currency,
    },
    message: `${params.period}: Income ${currency} ${totalIncome.toLocaleString()}, Expenses ${currency} ${totalExpense.toLocaleString()}, Net ${currency} ${(totalIncome - totalExpense).toLocaleString()}.`,
  };
}

function handleGetBudgets(): ToolResult {
  const budgetState = useBudgetStore.getState();
  const txState = useTransactionStore.getState();
  const groups = computeBudgetGroups(budgetState.budgets, txState.transactions);

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  const formatted = groups.map(g => {
    const pct = g.totalAmount > 0 ? Math.round((g.totalSpent / g.totalAmount) * 100) : 0;
    return {
      name: g.name,
      totalAmount: g.totalAmount,
      totalSpent: g.totalSpent,
      remaining: g.totalAmount - g.totalSpent,
      percentUsed: pct,
      status: pct >= 100 ? 'over_budget' : pct >= 80 ? 'warning' : 'on_track',
      period: g.period,
      categories: g.categories.map(c => getCategoryLabel(c.category)),
    };
  });

  return {
    success: true,
    data: formatted,
    message: `Found ${formatted.length} budget group(s).`,
  };
}

function handleGetBudgetDetail(params: Record<string, any>): ToolResult {
  const budgetState = useBudgetStore.getState();
  const txState = useTransactionStore.getState();
  const groups = computeBudgetGroups(budgetState.budgets, txState.transactions);

  const group = groups.find(g => g.name.toLowerCase() === (params.name || '').toLowerCase());
  if (!group) {
    return { success: false, message: `Budget group "${params.name}" not found.` };
  }

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  const detail = {
    name: group.name,
    period: group.period,
    totalAmount: group.totalAmount,
    totalSpent: group.totalSpent,
    remaining: group.totalAmount - group.totalSpent,
    percentUsed: group.totalAmount > 0 ? Math.round((group.totalSpent / group.totalAmount) * 100) : 0,
    categories: group.categories.map(c => ({
      category: getCategoryLabel(c.category),
      categoryId: c.category,
      budgetId: c.id,
      amount: c.amount,
      spent: c.spent,
    })),
  };

  return { success: true, data: detail, message: `Budget "${group.name}" details retrieved.` };
}

function handleGetAccounts(): ToolResult {
  const accountState = useAccountStore.getState();
  const accounts = accountState.accounts
    .filter(a => a.syncStatus !== 'pending_delete')
    .map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance,
      currency: a.currency,
    }));

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return {
    success: true,
    data: { accounts, totalBalance },
    message: `Found ${accounts.length} account(s). Total balance: ${totalBalance.toLocaleString()}.`,
  };
}

function handleGetSpendingInsights(params: Record<string, any>): ToolResult {
  const txState = useTransactionStore.getState();
  const activeTxs = txState.transactions.filter(t => t.syncStatus !== 'pending_delete');
  const { start, end } = getDateRange(params.period || 'this_month');

  const periodTxs = activeTxs.filter(t => {
    const d = new Date(t.date);
    return d >= start && d <= end && t.type === 'expense';
  });

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  periodTxs.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, total]) => ({ category: getCategoryLabel(cat), categoryId: cat, total }));

  const totalExpense = periodTxs.reduce((s, t) => s + t.amount, 0);

  // Daily average
  const dayMs = 1000 * 60 * 60 * 24;
  const daySpan = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
  const dailyAverage = totalExpense / daySpan;

  // Largest single expense
  const largest = periodTxs.length > 0
    ? periodTxs.reduce((max, t) => t.amount > max.amount ? t : max)
    : null;

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  return {
    success: true,
    data: {
      period: params.period || 'this_month',
      totalExpense,
      transactionCount: periodTxs.length,
      dailyAverage: Math.round(dailyAverage),
      topCategories: sorted.slice(0, 5),
      largestExpense: largest ? {
        amount: largest.amount,
        category: getCategoryLabel(largest.category),
        description: largest.description,
        date: largest.date,
      } : null,
    },
    message: `Spending insights for ${params.period || 'this_month'}: Total ${currency} ${totalExpense.toLocaleString()} across ${periodTxs.length} transactions.`,
  };
}

function handleGetProfile(): ToolResult {
  const authState = useAuthStore.getState();
  const user = authState.user;

  if (!user) {
    return { success: false, message: 'No user profile found. You may be in guest mode.' };
  }

  return {
    success: true,
    data: {
      name: user.name,
      email: user.email,
      currency: user.currency,
      memberSince: user.createdAt,
      avatarUrl: user.avatarUrl,
    },
    message: `Profile: ${user.name} (${user.email})`,
  };
}

async function handleCreateTransaction(params: Record<string, any>): Promise<ToolResult> {
  const { type, amount, category, description, date } = params;

  if (!type || !amount || !category) {
    return { success: false, message: 'Missing required fields: type, amount, and category are all required.' };
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return { success: false, message: 'Amount must be a positive number.' };
  }

  // Validate category exists
  const allCategories = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  const validCategory = allCategories.find(c => c.id === category);
  if (!validCategory) {
    return {
      success: false,
      message: `Invalid category "${category}". Valid categories: ${allCategories.map(c => c.id).join(', ')}.`,
    };
  }

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  const dto: CreateTransactionDto = {
    type,
    amount,
    currency,
    category,
    description: description || '',
    date: date || new Date().toISOString().split('T')[0],
  };

  const txStore = useTransactionStore.getState();
  const newTx = await txStore.createTransaction(dto);

  return {
    success: true,
    data: { id: newTx.id, ...dto },
    message: `✅ Created ${type} transaction: ${currency} ${amount.toLocaleString()} for ${getCategoryLabel(category)}${description ? ` — ${description}` : ''}.`,
  };
}

async function handleCreateBudget(params: Record<string, any>): Promise<ToolResult> {
  const { name, period, categories, amounts } = params;

  if (!name || !period || !categories || !amounts) {
    return { success: false, message: 'Missing required fields: name, period, categories, and amounts.' };
  }

  const catIds = (categories as string).split(',').map((s: string) => s.trim());
  const catAmounts = (amounts as string).split(',').map((s: string) => parseFloat(s.trim()));

  if (catIds.length !== catAmounts.length) {
    return { success: false, message: 'Categories and amounts must have the same number of items.' };
  }

  const authState = useAuthStore.getState();
  const currency = authState.user?.currency || DEFAULT_CURRENCY;

  const budgetStore = useBudgetStore.getState();
  const newBudgets = await budgetStore.createBudgetGroup({
    name,
    period,
    startDate: new Date().toISOString().split('T')[0],
    color: '#7C6BFF',
    emoji: '💰',
    currency,
    categories: catIds.map((id, i) => ({ categoryId: id, amount: catAmounts[i] })),
  });

  const totalAmount = catAmounts.reduce((s, a) => s + a, 0);

  return {
    success: true,
    data: { name, categoryCount: catIds.length, totalAmount },
    message: `✅ Created budget "${name}" with ${catIds.length} categories, total ${currency} ${totalAmount.toLocaleString()} (${period}).`,
  };
}

async function handleUpdateBudget(params: Record<string, any>): Promise<ToolResult> {
  const { budget_id, amount } = params;

  if (!budget_id) {
    return { success: false, message: 'Missing required field: budget_id.' };
  }

  const updates: Record<string, any> = {};
  if (amount !== undefined) updates.amount = amount;

  if (Object.keys(updates).length === 0) {
    return { success: false, message: 'No update fields provided.' };
  }

  const budgetStore = useBudgetStore.getState();
  await budgetStore.updateBudget(budget_id, updates);

  return {
    success: true,
    message: `✅ Budget updated successfully.`,
  };
}

function handleUpdateSettings(params: Record<string, any>): ToolResult {
  const settingsStore = useSettingsStore.getState();

  if (params.theme) {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(params.theme)) {
      return { success: false, message: `Invalid theme. Valid options: ${validThemes.join(', ')}.` };
    }
    settingsStore.setTheme(params.theme);
  }

  return {
    success: true,
    message: `✅ Settings updated${params.theme ? ` — theme set to "${params.theme}"` : ''}.`,
  };
}

async function handleDeleteTransaction(params: Record<string, any>): Promise<ToolResult> {
  const { transaction_id } = params;
  if (!transaction_id) {
    return { success: false, message: 'Missing required field: transaction_id.' };
  }

  const txStore = useTransactionStore.getState();
  const tx = txStore.transactions.find(t => t.id === transaction_id);
  if (!tx) {
    return { success: false, message: `Transaction "${transaction_id}" not found.` };
  }

  await txStore.deleteTransaction(transaction_id);

  return {
    success: true,
    message: `✅ Transaction deleted: ${getCategoryLabel(tx.category)} — ${tx.amount.toLocaleString()}.`,
  };
}

async function handleDeleteBudget(params: Record<string, any>): Promise<ToolResult> {
  const { name } = params;
  if (!name) {
    return { success: false, message: 'Missing required field: name.' };
  }

  const budgetStore = useBudgetStore.getState();
  await budgetStore.deleteBudgetGroup(name);

  return {
    success: true,
    message: `✅ Budget group "${name}" deleted.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

function buildConfirmationDescription(call: ToolCall): string {
  switch (call.tool) {
    case 'delete_transaction': {
      const txStore = useTransactionStore.getState();
      const tx = txStore.transactions.find(t => t.id === call.params.transaction_id);
      if (tx) {
        return `Delete transaction: ${getCategoryLabel(tx.category)} — ${tx.amount.toLocaleString()} on ${tx.date}`;
      }
      return `Delete transaction ${call.params.transaction_id}`;
    }
    case 'delete_budget':
      return `Delete budget group "${call.params.name}" and all its categories`;
    default:
      return `Execute ${call.tool}`;
  }
}
