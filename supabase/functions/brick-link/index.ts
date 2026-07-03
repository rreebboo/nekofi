// supabase/functions/brick-link/index.ts
// Called after the user successfully completes the Brick Link widget.
// Saves the linked account, fetches the initial balance, and syncs recent transactions.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BRICK_BASE_URL = Deno.env.get('BRICK_BASE_URL') || 'https://sandbox.onebrick.io/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create an authenticated Supabase client for user-context queries
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create a service-role client for inserting data (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body
    const { accessToken, accountId, institutionName } = await req.json();
    if (!accessToken || !accountId || !institutionName) {
      return new Response(
        JSON.stringify({ error: 'accessToken, accountId, and institutionName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Step 1: Fetch account balance from Brick ───
    const balanceResponse = await fetch(`${BRICK_BASE_URL}/account/list`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    let balance = 0;
    let brickInstitutionId = institutionName.toLowerCase().replace(/\s+/g, '');

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      const accounts = balanceData.data || [];
      if (accounts.length > 0) {
        balance = accounts[0].balances?.current || accounts[0].balance || 0;
        brickInstitutionId = accounts[0].institutionId || brickInstitutionId;
      }
    } else {
      console.warn('Could not fetch balance from Brick:', await balanceResponse.text());
    }

    // ─── Step 2: Save the linked account record ───
    const { data: linkedAccount, error: linkError } = await supabaseAdmin
      .from('linked_accounts')
      .insert({
        user_id: user.id,
        account_id: accountId,
        provider: 'brick',
        institution_id: brickInstitutionId,
        institution_name: institutionName,
        access_token: accessToken,
        status: 'active',
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error saving linked account:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to save linked account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Step 3: Update the account balance ───
    await supabaseAdmin
      .from('accounts')
      .update({ balance, updated_at: new Date().toISOString() })
      .eq('id', accountId);

    // ─── Step 4: Fetch and sync recent transactions ───
    let syncedCount = 0;
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD
      const toDate = now.toISOString().split('T')[0];

      const txResponse = await fetch(
        `${BRICK_BASE_URL}/transaction/list?from=${fromDate}&to=${toDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (txResponse.ok) {
        const txData = await txResponse.json();
        const transactions = txData.data || [];

        // Map Brick transactions to our schema and insert them
        const mappedTxs = transactions.map((tx: any) => ({
          user_id: user.id,
          type: tx.direction === 'in' ? 'income' : 'expense',
          amount: Math.abs(tx.amount),
          currency: 'PHP',
          category: mapBrickCategory(tx.category?.category_name || tx.category || 'Uncategorized'),
          description: tx.description || tx.merchant_name || tx.reference_id || '',
          date: tx.date || tx.dateTimestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
          account_id: accountId,
          source: 'brick_sync',
          external_id: `brick_${tx.id || tx.reference_id || tx.transaction_id}`,
        }));

        if (mappedTxs.length > 0) {
          const { error: txInsertError } = await supabaseAdmin
            .from('transactions')
            .upsert(mappedTxs, {
              onConflict: 'external_id',
              ignoreDuplicates: true,
            });

          if (txInsertError) {
            console.warn('Error inserting synced transactions:', txInsertError);
          } else {
            syncedCount = mappedTxs.length;
          }
        }
      }
    } catch (syncError) {
      console.warn('Transaction sync error (non-fatal):', syncError);
    }

    return new Response(
      JSON.stringify({
        linkedAccountId: linkedAccount.id,
        balance,
        institutionName,
        syncedTransactions: syncedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('brick-link error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Maps Brick's raw category names to Nekofi's category system.
 * Falls back to the raw category name if no mapping exists.
 */
function mapBrickCategory(brickCategory: string): string {
  const categoryMap: Record<string, string> = {
    'food_and_drink': 'Food & Drinks',
    'food': 'Food & Drinks',
    'transportation': 'Transport',
    'transport': 'Transport',
    'shopping': 'Shopping',
    'bills_and_utilities': 'Bills',
    'bills': 'Bills',
    'utilities': 'Bills',
    'entertainment': 'Entertainment',
    'health': 'Health',
    'healthcare': 'Health',
    'education': 'Education',
    'travel': 'Travel',
    'transfer': 'Transfer',
    'income': 'Income',
    'salary': 'Income',
    'investment': 'Investment',
    'uncategorized': 'Other',
  };

  const normalized = brickCategory.toLowerCase().replace(/\s+/g, '_');
  return categoryMap[normalized] || brickCategory;
}
