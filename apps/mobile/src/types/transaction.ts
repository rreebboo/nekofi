import type { SyncStatus } from './account';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionSource = 'manual' | 'brick_sync' | 'brick_webhook';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string; // ISO 8601
  accountId?: string;
  source?: TransactionSource;
  externalId?: string;
  receiptUrl?: string;
  budgetId?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
  budgetId?: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  period: 'week' | 'month' | 'year';
}
