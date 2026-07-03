import { supabase } from './supabase/client';

const BRICK_TOKEN_FUNCTION = 'brick-token';
const BRICK_LINK_FUNCTION = 'brick-link';

export interface BrickPublicTokenResponse {
  publicToken: string;
  redirectUrl: string;
}

export interface BrickLinkResponse {
  linkedAccountId: string;
  balance: number;
  institutionName: string;
}

export const brickService = {
  async getPublicToken(institutionName: string): Promise<BrickPublicTokenResponse> {
    const { data, error } = await supabase.functions.invoke(BRICK_TOKEN_FUNCTION, {
      body: { institutionName },
    });

    if (error) {
      console.error('Error getting Brick public token:', error);
      throw new Error(error.message || 'Failed to get connection token');
    }

    return data as BrickPublicTokenResponse;
  },

  async linkAccount(
    accessToken: string,
    accountId: string,
    institutionName: string,
  ): Promise<BrickLinkResponse> {
    const { data, error } = await supabase.functions.invoke(BRICK_LINK_FUNCTION, {
      body: { accessToken, accountId, institutionName },
    });

    if (error) {
      console.error('Error linking Brick account:', error);
      throw new Error(error.message || 'Failed to link account');
    }

    return data as BrickLinkResponse;
  },

  async syncTransactions(linkedAccountId: string): Promise<{ synced: number }> {
    const { data, error } = await supabase.functions.invoke('brick-sync', {
      body: { linkedAccountId },
    });

    if (error) {
      console.error('Error syncing transactions:', error);
      throw new Error(error.message || 'Failed to sync transactions');
    }

    return data as { synced: number };
  },
};
