import { Ionicons } from '@expo/vector-icons';

export type AccountType = 'bank' | 'wallet' | 'cash';

export type SyncStatus = 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  brandIcon: keyof typeof Ionicons.glyphMap;
  balance: number;
  currency: string;
  color: string;
  gradientEnd: string;
  textColor: string;
  numberMasked?: string;
  linkedAccountId?: string;
  isLinked?: boolean;
  /**
   * When true, this account was mock-connected and lives only in local storage.
   * fetchAccounts will preserve it even though it doesn't exist in Supabase.
   */
  isLocal?: boolean;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export interface CreateAccountDto {
  name: string;
  type: AccountType;
  brandIcon: keyof typeof Ionicons.glyphMap;
  balance?: number;
  currency?: string;
  color: string;
  gradientEnd: string;
  textColor: string;
  numberMasked?: string;
}
