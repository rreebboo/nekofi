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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ─── Guard: Brankas API key must be configured ───
    if (!BRANKAS_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Open Finance provider is not configured. Please contact support.',
          details: 'BRANKAS_API_KEY secret is missing.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Authenticate the calling user ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed.', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Parse request body ───
    const { institutionName } = await req.json();
    // institutionName is kept for logging/tracking; bank selection
    // happens inside the Brankas Tap UI, not via our API call.

    // ─── Call Brankas Statement Init ───
    // POST /v1/statement-init
    // We intentionally omit bank_codes and bank_selected so the Brankas
    // Tap UI shows all banks available in the current environment
    // (test banks in sandbox, real PH banks in production).
    const initBody = {
      country: 'PH',
      organization_display_name: 'Nekofi',
      external_id: user.id,
      app_redirect_uri: 'nekofi://bank-connect/success',
      app_redirect_error_uri: 'nekofi://bank-connect/error',
      auto_consent: false,
      include_balance: true,
    };

    const brankasRes = await fetch(`${BRANKAS_STATEMENT_BASE}/v1/statement-init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BRANKAS_API_KEY,
      },
      body: JSON.stringify(initBody),
    });

    if (!brankasRes.ok) {
      const errBody = await brankasRes.text();
      console.error('[brankas-token] Brankas API error:', brankasRes.status, errBody);
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize bank connection. Please try again.',
          details: errBody,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const brankasData = await brankasRes.json();
    // brankasData = { statement_id, redirect_uri, time_consent_granted }

    if (!brankasData.redirect_uri) {
      return new Response(
        JSON.stringify({
          error: 'No redirect URL received from the provider.',
          details: JSON.stringify(brankasData),
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ─── Return the Tap session to the frontend ───
    return new Response(
      JSON.stringify({
        redirectUrl: brankasData.redirect_uri,
        statementId: brankasData.statement_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[brankas-token] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
