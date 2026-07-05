/**
 * SystemContextProvider
 *
 * Collects the user's entire financial state from all Zustand stores and
 * compresses it into a compact context string that fits within the LLM's
 * token budget (~800 tokens reserved for context).
 *
 * All data access goes through the stores, which in turn use the
 * authenticated Supabase session — RLS is always respected.
 */

import { useAuthStore } from '@/stores/authStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useBudgetStore, computeBudgetGroups } from '@/stores/budgetStore';
import { useAccountStore } from '@/stores/accountStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';

// Maximum number of recent transactions to include in the context
const MAX_RECENT_TRANSACTIONS = 15;

export interface FinancialContext {
  raw: {
    userName: string;
    currency: string;
    memberSince: string;
    accounts: { name: string; type: string; balance: number; currency: string }[];
    recentTransactions: { type: string; amount: number; category: string; description: string; date: string }[];
    totalIncomeThisMonth: number;
    totalExpenseThisMonth: number;
    topExpenseCategories: { category: string; total: number }[];
    budgetGroups: { name: string; totalAmount: number; totalSpent: number; period: string; categories: string[] }[];
    theme: string;
  };
  /** Pre-formatted summary string for the LLM prompt */
  promptText: string;
}

/**
 * Resolves a category ID to a human-readable label.
 */
function getCategoryLabel(id: string): string {
  const expense = EXPENSE_CATEGORIES.find(c => c.id === id);
  if (expense) return expense.label;
  const income = INCOME_CATEGORIES.find(c => c.id === id);
  if (income) return income.label;
  return id; // fallback to raw ID
}

/**
 * Gathers and formats the full financial context.
 * Call this before each AI prompt to ensure fresh data.
 */
export function gatherFinancialContext(): FinancialContext {
  const authState = useAuthStore.getState();
  const txState = useTransactionStore.getState();
  const budgetState = useBudgetStore.getState();
  const accountState = useAccountStore.getState();
  const settingsState = useSettingsStore.getState();

  const user = authState.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  const currency = user?.currency || 'PHP';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  // ── Accounts ────────────────────────────────────────────────
  const accounts = accountState.accounts
    .filter(a => a.syncStatus !== 'pending_delete')
    .map(a => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
      currency: a.currency,
    }));

  // ── Transactions ────────────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeTxs = txState.transactions.filter(t => t.syncStatus !== 'pending_delete');

  const thisMonthTxs = activeTxs.filter(t => new Date(t.date) >= startOfMonth);

  const totalIncomeThisMonth = thisMonthTxs
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenseThisMonth = thisMonthTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Top expense categories this month
  const categoryTotals: Record<string, number> = {};
  thisMonthTxs
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const topExpenseCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, total]) => ({ category: getCategoryLabel(category), total }));

  // Recent transactions
  const recentTransactions = activeTxs
    .slice(0, MAX_RECENT_TRANSACTIONS)
    .map(t => ({
      type: t.type,
      amount: t.amount,
      category: getCategoryLabel(t.category),
      description: t.description,
      date: t.date,
    }));

  // ── Budgets ─────────────────────────────────────────────────
  const groups = computeBudgetGroups(budgetState.budgets, txState.transactions);
  const budgetGroups = groups.map(g => ({
    name: g.name,
    totalAmount: g.totalAmount,
    totalSpent: g.totalSpent,
    period: g.period,
    categories: g.categories.map(c => getCategoryLabel(c.category)),
  }));

  // ── Build prompt text ───────────────────────────────────────
  const lines: string[] = [];
  lines.push(`[USER CONTEXT]`);
  lines.push(`Name: ${userName} | Currency: ${currency} | Member since: ${memberSince}`);
  lines.push(`Theme: ${settingsState.theme}`);
  lines.push(`Today: ${now.toISOString().split('T')[0]}`);
  lines.push('');

  if (accounts.length > 0) {
    lines.push(`[ACCOUNTS] (${accounts.length})`);
    accounts.forEach(a => {
      lines.push(`• ${a.name} (${a.type}) — ${a.currency} ${a.balance.toLocaleString()}`);
    });
    lines.push('');
  }

  lines.push(`[THIS MONTH SUMMARY]`);
  lines.push(`Income: ${currency} ${totalIncomeThisMonth.toLocaleString()} | Expenses: ${currency} ${totalExpenseThisMonth.toLocaleString()} | Net: ${currency} ${(totalIncomeThisMonth - totalExpenseThisMonth).toLocaleString()}`);

  if (topExpenseCategories.length > 0) {
    lines.push(`Top spending: ${topExpenseCategories.map(c => `${c.category} (${currency} ${c.total.toLocaleString()})`).join(', ')}`);
  }
  lines.push('');

  if (budgetGroups.length > 0) {
    lines.push(`[BUDGETS] (${budgetGroups.length} groups)`);
    budgetGroups.forEach(b => {
      const pct = b.totalAmount > 0 ? Math.round((b.totalSpent / b.totalAmount) * 100) : 0;
      const status = pct >= 100 ? '🔴 OVER' : pct >= 80 ? '🟡 WARNING' : '🟢 OK';
      lines.push(`• ${b.name}: ${currency} ${b.totalSpent.toLocaleString()}/${currency} ${b.totalAmount.toLocaleString()} (${pct}%) ${status} [${b.period}]`);
    });
    lines.push('');
  }

  if (recentTransactions.length > 0) {
    lines.push(`[RECENT TRANSACTIONS] (last ${recentTransactions.length})`);
    recentTransactions.forEach(t => {
      const sign = t.type === 'income' ? '+' : '-';
      lines.push(`• ${t.date} ${sign}${currency} ${t.amount.toLocaleString()} ${t.category}${t.description ? ` — ${t.description}` : ''}`);
    });
  }

  const raw = {
    userName,
    currency,
    memberSince,
    accounts,
    recentTransactions,
    totalIncomeThisMonth,
    totalExpenseThisMonth,
    topExpenseCategories,
    budgetGroups,
    theme: settingsState.theme,
  };

  return {
    raw,
    promptText: lines.join('\n'),
  };
}

/**
 * Returns a very short one-liner context suitable for insight generation.
 */
export function gatherQuickContext(): string {
  const ctx = gatherFinancialContext();
  const { totalIncomeThisMonth, totalExpenseThisMonth, topExpenseCategories, budgetGroups, currency } = ctx.raw;

  const parts: string[] = [];
  parts.push(`This month: income ${currency} ${totalIncomeThisMonth.toLocaleString()}, expenses ${currency} ${totalExpenseThisMonth.toLocaleString()}.`);

  if (topExpenseCategories.length > 0) {
    parts.push(`Top spending: ${topExpenseCategories[0].category} (${currency} ${topExpenseCategories[0].total.toLocaleString()}).`);
  }

  const overBudgets = budgetGroups.filter(b => b.totalAmount > 0 && b.totalSpent > b.totalAmount);
  if (overBudgets.length > 0) {
    parts.push(`Over budget: ${overBudgets.map(b => b.name).join(', ')}.`);
  }

  return parts.join(' ');
}
