import { Ionicons } from '@expo/vector-icons';

export type AccountType = 'bank' | 'wallet' | 'cash';

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
  createdAt: string;
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
