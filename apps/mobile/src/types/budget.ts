import type { SyncStatus } from './account';

export interface Budget {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  color: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}

export interface CreateBudgetDto {
  name: string;
  category: string;
  amount: number;
  currency: string;
  period: Budget['period'];
  startDate: string;
  color: string;
  emoji: string;
}

export interface BudgetWithProgress extends Budget {
  progressPercent: number;
  remaining: number;
  isOverBudget: boolean;
}
