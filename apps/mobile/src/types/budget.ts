import type { SyncStatus } from './account';

export interface Budget {
  id: string;
  userId: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  currency: string;
  period: 'custom' | 'monthly' | 'yearly';
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
  endDate?: string;
  color: string;
  emoji: string;
}

export interface BudgetWithProgress extends Budget {
  progressPercent: number;
  remaining: number;
  isOverBudget: boolean;
}

export interface BudgetGroup {
  name: string;
  period: 'custom' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  color: string;
  emoji: string;
  totalAmount: number;
  totalSpent: number;
  categories: Budget[];
}

export interface CreateBudgetGroupDto {
  name: string;
  period: 'custom' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  color: string;
  emoji: string;
  currency: string;
  categories: {
    categoryId: string;
    amount: number;
  }[];
}

export interface BudgetInvite {
  budgetName: string;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  inviteeId: string;
  invitedAt: string;
}

export interface BudgetCollaborator {
  budgetName: string;
  ownerId: string;
  collaboratorId: string;
  collaboratorName: string;
  collaboratorAvatarUrl: string | null;
  status: 'pending' | 'accepted' | 'declined';
}
