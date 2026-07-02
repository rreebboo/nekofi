import { supabase } from './supabase/client';
import { Wallet, CreateWalletInput } from '@/types/wallet';

export const walletService = {
  /**
   * Fetch all wallets for the current user
   */
  async getWallets(): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching wallets:', error);
      throw error;
    }

    // Map from snake_case to camelCase
    return (data || []).map(mapWallet);
  },

  /**
   * Add a new wallet
   */
  async createWallet(input: CreateWalletInput, userId: string): Promise<Wallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        name: input.name,
        provider: input.provider,
        balance: input.balance,
        currency: input.currency,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }

    return mapWallet(data);
  },

  /**
   * Delete a wallet
   */
  async deleteWallet(walletId: string): Promise<void> {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId);

    if (error) {
      console.error('Error deleting wallet:', error);
      throw error;
    }
  },
};

// Helper function to map Supabase snake_case to our TypeScript camelCase model
function mapWallet(data: any): Wallet {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    provider: data.provider,
    balance: data.balance,
    currency: data.currency,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
