export type LinkedAccountProvider = 'brick';

export type LinkedAccountStatus = 'active' | 'expired' | 'revoked' | 'error';

export interface LinkedAccount {
  id: string;
  userId: string;
  accountId: string;
  provider: LinkedAccountProvider;
  institutionId: string;
  institutionName: string;
  status: LinkedAccountStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Maps Brick institution names to account option names used in the app */
export const BRICK_INSTITUTION_MAP: Record<string, string> = {
  'gcash': 'GCash',
  'bdo': 'BDO Unibank',
  'bpi': 'BPI',
  'unionbank': 'UnionBank',
  'maya': 'Maya',
  'grabpay': 'GrabPay',
};
