export type WalletProvider = 'plaid' | 'saltedge' | 'manual';

export interface Wallet {
  id: string;
  userId: string;
  name: string; // e.g. "Chase Checking"
  provider: WalletProvider;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateWalletInput = Omit<Wallet, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
