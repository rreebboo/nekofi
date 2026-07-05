import type { SyncStatus } from './account';

export type NotificationType = 'budget' | 'expense' | 'income' | 'goal' | 'account' | 'reminder' | 'general';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  metadata: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
}
