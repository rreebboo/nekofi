// @ts-nocheck — Supabase Edge Functions run on Deno, not Node.js
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BRANKAS_API_KEY = Deno.env.get('BRANKAS_API_KEY') ?? '';
const BRANKAS_ENV = (Deno.env.get('BRANKAS_ENV') ?? 'sandbox').toLowerCase();
const BRANKAS_STATEMENT_BASE = BRANKAS_ENV === 'production'
  ? 'https://statement.bnk.to'
  : 'https://statement.sandbox.bnk.to';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Map Brankas bank_code to a human-readable institution name.
 */
const BANK_CODE_TO_NAME: Record<string, string> = {
  BDO_PERSONAL:        'BDO Unibank',
  BPI_PERSONAL:        'BPI',
  UNIONBANK_PERSONAL:  'UnionBank',
  GCASH_PERSONAL:      'GCash',
  PNB_PERSONAL:        'PNB',
  METROBANK_PERSONAL:  'Metrobank',
  RCBC_PERSONAL:       'RCBC',
  LANDBANK_PERSONAL:   'Landbank',
  DUMMY_BANK_PERSONAL: 'Test Bank',
};

/**
 * Parse Brankas amount to a numeric value.
 * Brankas represents amounts in cents for PH: "10000" = PHP 100.00
 * But the `decimal.num` field contains the human-readable value like "100.00"
 */
function parseAmount(amount: { num?: string; decimal?: { num?: string } } | undefined): number {
  if (!amount) return 0;
  // Prefer the decimal representation if available
  if (amount.decimal?.num) {
    return parseFloat(amount.decimal.num) || 0;
  }
  // Fallback: raw cents → divide by 100
  if (amount.num) {
    return parseInt(amount.num, 10) / 100;
  }
  return 0;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ─── Guard: Brankas API key ───
    if (!BRANKAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Open Finance provider is not configured.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Parse the incoming webhook / manual sync request ───
    // This function handles two scenarios:
    // 1. Webhook from Brankas (statement completed notification)
    // 2. Manual poll from the frontend (passing statementId + userId)
    const body = await req.json();
    const { statementId, userId } = body;

    if (!statementId) {
      return new Response(
        JSON.stringify({ error: 'Missing statementId.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Create a service-role Supabase client for DB writes ───
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // ─── Fetch statement details from Brankas ───
    // GET /v1/statements?statement_ids=<id>
    const statementsUrl = new URL(`${BRANKAS_STATEMENT_BASE}/v1/statements`);
    statementsUrl.searchParams.set('statement_ids', statementId);

    const brankasRes = await fetch(statementsUrl.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': BRANKAS_API_KEY,
      },
    });

    if (!brankasRes.ok) {
      const errText = await brankasRes.text();
      console.error('[brankas-sync] Brankas API error:', brankasRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch statement data.', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const statementsData = await brankasRes.json();
    // statementsData.statements is an array of statementretrievalStatement objects

    const statements = statementsData.statements || [];
    if (statements.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No statement data found.', status: 'pending' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const statement = statements[0];

    // Check if the statement retrieval is still in progress
    if (statement.status !== 'COMPLETED' && statement.status !== 'RECORDS_AVAILABLE') {
      return new Response(
        JSON.stringify({
          status: statement.status,
          message: 'Statement retrieval is still in progress.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Process account statements and insert transactions ───
    const accountStatements = statement.account_statements || [];
    let totalSynced = 0;
    let balance = 0;
    let bankName = BANK_CODE_TO_NAME[statement.bank_code] || statement.bank_code || 'Unknown Bank';

    for (const accStmt of accountStatements) {
      const account = accStmt.account;
      if (account?.balance) {
        balance = parseAmount(account.balance);
      }

      const transactions = accStmt.transactions || [];

      for (const tx of transactions) {
        const isCredit = tx.type === 'CREDIT';
        const amount = parseAmount(tx.amount);

        // Build the transaction record matching the Nekofi schema
        const record = {
          user_id: userId,
          type: isCredit ? 'income' : 'expense',
          amount: amount,
          currency: tx.amount?.cur || 'PHP',
          category: tx.merchant_type?.[0] || (isCredit ? 'Income' : 'General'),
          description: tx.descriptor || 'Bank transaction',
          date: tx.date || new Date().toISOString(),
          source: 'brankas_sync',
          external_id: tx.transaction_id || tx.account_transaction_hash || null,
        };

        // Upsert: avoid duplicate transactions by checking external_id
        if (record.external_id) {
          const { error: upsertErr } = await supabase
            .from('transactions')
            .upsert(record, { onConflict: 'external_id' });

          if (upsertErr) {
            console.error('[brankas-sync] Upsert error:', upsertErr);
          } else {
            totalSynced++;
          }
        } else {
          const { error: insertErr } = await supabase
            .from('transactions')
            .insert(record);

          if (insertErr) {
            console.error('[brankas-sync] Insert error:', insertErr);
          } else {
            totalSynced++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: 'synced',
        syncedTransactions: totalSynced,
        balance,
        bankName,
        statementId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[brankas-sync] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
