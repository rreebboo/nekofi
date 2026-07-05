/**
 * AIToolDefinitions
 *
 * Defines every tool the LLM can invoke, including parameter schemas
 * and human-readable descriptions. These are injected into the system
 * prompt so the model knows what actions are available.
 */

export interface ToolParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  params: ToolParam[];
}

export const AI_TOOLS: ToolDefinition[] = [
  // ── READ operations ─────────────────────────────────────────
  {
    name: 'get_transactions',
    description: 'Query the user\'s transactions with optional filters. Returns a list of transactions.',
    params: [
      { name: 'period', type: 'string', required: false, description: 'Time period: "today", "this_week", "this_month", "this_year", "all"', enum: ['today', 'this_week', 'this_month', 'this_year', 'all'] },
      { name: 'category', type: 'string', required: false, description: 'Filter by category (e.g. "food", "transport", "salary")' },
      { name: 'type', type: 'string', required: false, description: 'Filter by type', enum: ['income', 'expense'] },
      { name: 'limit', type: 'number', required: false, description: 'Max results to return (default 10)' },
    ],
  },
  {
    name: 'get_transaction_summary',
    description: 'Get aggregated income/expense totals and net balance for a period.',
    params: [
      { name: 'period', type: 'string', required: true, description: 'Time period', enum: ['today', 'this_week', 'this_month', 'this_year'] },
    ],
  },
  {
    name: 'get_budgets',
    description: 'List all budget groups with their spent amounts, limits, and status.',
    params: [],
  },
  {
    name: 'get_budget_detail',
    description: 'Get detailed breakdown of a specific budget group by name.',
    params: [
      { name: 'name', type: 'string', required: true, description: 'The budget group name' },
    ],
  },
  {
    name: 'get_accounts',
    description: 'List all financial accounts (bank, wallet, cash) with their balances.',
    params: [],
  },
  {
    name: 'get_spending_insights',
    description: 'Analyze spending patterns: top categories, trends, comparisons.',
    params: [
      { name: 'period', type: 'string', required: false, description: 'Analysis period', enum: ['this_week', 'this_month', 'this_year'] },
    ],
  },
  {
    name: 'get_profile',
    description: 'Get the user\'s profile information: name, email, currency, member since.',
    params: [],
  },

  // ── WRITE operations ────────────────────────────────────────
  {
    name: 'create_transaction',
    description: 'Create a new transaction (income or expense). The user must provide at least type, amount, and category.',
    params: [
      { name: 'type', type: 'string', required: true, description: 'Transaction type', enum: ['income', 'expense'] },
      { name: 'amount', type: 'number', required: true, description: 'Amount (positive number)' },
      { name: 'category', type: 'string', required: true, description: 'Category ID (e.g. "food", "salary", "transport")' },
      { name: 'description', type: 'string', required: false, description: 'Short description of the transaction' },
      { name: 'date', type: 'string', required: false, description: 'Date in YYYY-MM-DD format (defaults to today)' },
    ],
  },
  {
    name: 'create_budget',
    description: 'Create a new budget group with specified categories and limits.',
    params: [
      { name: 'name', type: 'string', required: true, description: 'Budget group name' },
      { name: 'period', type: 'string', required: true, description: 'Budget period', enum: ['monthly', 'yearly'] },
      { name: 'categories', type: 'string', required: true, description: 'Comma-separated category IDs (e.g. "food,transport")' },
      { name: 'amounts', type: 'string', required: true, description: 'Comma-separated amounts for each category (e.g. "5000,3000")' },
    ],
  },
  {
    name: 'update_budget',
    description: 'Update a budget\'s limit amount.',
    params: [
      { name: 'budget_id', type: 'string', required: true, description: 'The budget ID to update' },
      { name: 'amount', type: 'number', required: false, description: 'New budget limit amount' },
    ],
  },
  {
    name: 'update_settings',
    description: 'Change app settings like theme.',
    params: [
      { name: 'theme', type: 'string', required: false, description: 'App theme', enum: ['light', 'dark', 'system'] },
    ],
  },

  // ── DESTRUCTIVE operations ──────────────────────────────────
  {
    name: 'delete_transaction',
    description: 'Delete a transaction by ID. Requires user confirmation.',
    params: [
      { name: 'transaction_id', type: 'string', required: true, description: 'The transaction ID to delete' },
    ],
  },
  {
    name: 'delete_budget',
    description: 'Delete an entire budget group by name. Requires user confirmation.',
    params: [
      { name: 'name', type: 'string', required: true, description: 'The budget group name to delete' },
    ],
  },
];

/**
 * Formats tool definitions into a compact text block for the system prompt.
 */
export function formatToolsForPrompt(): string {
  const lines: string[] = [];
  lines.push('[AVAILABLE TOOLS]');
  lines.push('Call a tool by responding with a JSON block: {"tool": "tool_name", "params": {...}}');
  lines.push('Only call one tool at a time. After a tool result, give a natural language response.');
  lines.push('');

  for (const tool of AI_TOOLS) {
    const paramStr = tool.params.length > 0
      ? tool.params.map(p => {
          let s = `${p.name}: ${p.type}${p.required ? ' (required)' : ''}`;
          if (p.enum) s += ` [${p.enum.join('|')}]`;
          return s;
        }).join(', ')
      : 'none';
    lines.push(`• ${tool.name}: ${tool.description}`);
    lines.push(`  Params: ${paramStr}`);
  }

  return lines.join('\n');
}

/**
 * Finds a tool definition by name.
 */
export function findTool(name: string): ToolDefinition | undefined {
  return AI_TOOLS.find(t => t.name === name);
}
