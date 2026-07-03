// supabase/functions/brick-webhook/index.ts
// Public webhook endpoint that receives transaction events from Brick.
// No Supabase JWT required — authenticated via Brick's webhook signature.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BRICK_WEBHOOK_SECRET = Deno.env.get('BRICK_WEBHOOK_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-brick-signature',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Service-role client for database operations (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  let payload: any;

  try {
    const rawBody = await req.text();
    payload = JSON.parse(rawBody);

    // ─── Step 1: Verify webhook signature ───
    const signature = req.headers.get('x-brick-signature') || '';
    if (BRICK_WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature, BRICK_WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');

      // Still log the attempt for auditing
      await supabaseAdmin.from('aggregator_webhook_log').insert({
        provider: 'brick',
        event_type: payload.event || 'unknown',
        payload,
        status: 'failed',
        error: 'Invalid signature',
      });

      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Step 2: Log the raw webhook payload ───
    const { data: logEntry } = await supabaseAdmin
      .from('aggregator_webhook_log')
      .insert({
        provider: 'brick',
        event_type: payload.event || payload.type || 'transaction',
        payload,
        status: 'received',
      })
      .select('id')
      .single();

    // ─── Step 3: Process the webhook based on event type ───
    const eventType = payload.event || payload.type || 'transaction';

    if (eventType === 'transaction' || eventType === 'transaction.created') {
      await processTransactionWebhook(supabaseAdmin, payload, logEntry?.id);
    } else if (eventType === 'account.updated' || eventType === 'balance.updated') {
      await processBalanceWebhook(supabaseAdmin, payload, logEntry?.id);
    } else {
      console.log(`Unhandled webhook event type: ${eventType}`);
    }

    // Mark log entry as processed
    if (logEntry?.id) {
      await supabaseAdmin
        .from('aggregator_webhook_log')
        .update({ status: 'processed' })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('brick-webhook error:', err);

    // Try to log the error
    try {
      await supabaseAdmin.from('aggregator_webhook_log').insert({
        provider: 'brick',
        event_type: payload?.event || 'error',
        payload: payload || { raw_error: String(err) },
        status: 'failed',
        error: String(err),
      });
    } catch (_logErr) {
      console.error('Failed to log webhook error:', _logErr);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

/**
 * Process a new transaction webhook from Brick.
 * Finds the linked account, inserts the transaction, and updates the balance.
 */
async function processTransactionWebhook(
  supabase: any,
  payload: any,
  logId?: string,
) {
  const txData = payload.data || payload;
  const accessToken = txData.accessToken || txData.access_token;
  const institutionId = txData.institutionId || txData.institution_id;

  // Find the linked account that matches this webhook
  let linkedAccountQuery = supabase
    .from('linked_accounts')
    .select('id, user_id, account_id')
    .eq('status', 'active');

  if (accessToken) {
    linkedAccountQuery = linkedAccountQuery.eq('access_token', accessToken);
  } else if (institutionId) {
    linkedAccountQuery = linkedAccountQuery.eq('institution_id', institutionId);
  } else {
    console.warn('Webhook missing identifiers — cannot match to linked account');
    return;
  }

  const { data: linkedAccounts, error: laError } = await linkedAccountQuery;

  if (laError || !linkedAccounts || linkedAccounts.length === 0) {
    console.warn('No matching linked account found for webhook:', { accessToken, institutionId });
    return;
  }

  const linkedAccount = linkedAccounts[0];

  // Build the transaction record
  const transactions = Array.isArray(txData.transactions) ? txData.transactions : [txData];

  for (const tx of transactions) {
    const externalId = `brick_${tx.id || tx.reference_id || tx.transaction_id || Date.now()}`;
    const amount = Math.abs(tx.amount);
    const type = tx.direction === 'in' || tx.amount > 0 ? 'income' : 'expense';

    const transactionRecord = {
      user_id: linkedAccount.user_id,
      type,
      amount,
      currency: tx.currency || 'PHP',
      category: mapBrickCategory(tx.category?.category_name || tx.category || 'Uncategorized'),
      description: tx.description || tx.merchant_name || tx.reference_id || '',
      date: tx.date || tx.dateTimestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
      account_id: linkedAccount.account_id,
      source: 'brick_webhook',
      external_id: externalId,
    };

    // Upsert to avoid duplicates
    const { error: txError } = await supabase
      .from('transactions')
      .upsert(transactionRecord, {
        onConflict: 'external_id',
        ignoreDuplicates: false, // Update if exists (e.g., status change)
      });

    if (txError) {
      console.error('Error inserting webhook transaction:', txError);
    }
  }

  // Update the linked account's last_synced_at
  await supabase
    .from('linked_accounts')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', linkedAccount.id);
}

/**
 * Process a balance update webhook from Brick.
 */
async function processBalanceWebhook(
  supabase: any,
  payload: any,
  logId?: string,
) {
  const balanceData = payload.data || payload;
  const accessToken = balanceData.accessToken || balanceData.access_token;

  if (!accessToken) {
    console.warn('Balance webhook missing accessToken');
    return;
  }

  const { data: linkedAccounts } = await supabase
    .from('linked_accounts')
    .select('id, account_id')
    .eq('access_token', accessToken)
    .eq('status', 'active');

  if (!linkedAccounts || linkedAccounts.length === 0) {
    console.warn('No matching linked account for balance webhook');
    return;
  }

  const linkedAccount = linkedAccounts[0];
  const newBalance = balanceData.balance || balanceData.balances?.current || 0;

  // Update the account balance
  await supabase
    .from('accounts')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', linkedAccount.account_id);

  // Update last synced timestamp
  await supabase
    .from('linked_accounts')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', linkedAccount.id);
}

/**
 * Verify the Brick webhook signature.
 * Uses HMAC-SHA256 comparison.
 */
async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedSignature === signature;
  } catch {
    return false;
  }
}

/**
 * Maps Brick's raw category names to Nekofi's category system.
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
