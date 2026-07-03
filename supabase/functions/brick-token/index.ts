// supabase/functions/brick-token/index.ts
// Generates a Brick public access token so the mobile app can open the Link widget.
// This Edge Function requires authentication (Supabase JWT).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BRICK_BASE_URL = Deno.env.get('BRICK_BASE_URL') || 'https://sandbox.onebrick.io/v2';
const BRICK_CLIENT_ID = Deno.env.get('BRICK_CLIENT_ID') || '';
const BRICK_CLIENT_SECRET = Deno.env.get('BRICK_CLIENT_SECRET') || '';

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
    // Verify the user is authenticated via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Parse request body
    const { institutionName } = await req.json();
    if (!institutionName) {
      return new Response(
        JSON.stringify({ error: 'institutionName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Request a public access token from Brick
    // This token lets the frontend open the Brick Link widget securely
    const tokenResponse = await fetch(`${BRICK_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${BRICK_CLIENT_ID}:${BRICK_CLIENT_SECRET}`)}`,
      },
      body: JSON.stringify({
        institutionId: institutionName.toLowerCase().replace(/\s+/g, ''),
        username: user.id, // Use the Supabase user ID as the Brick user reference
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Brick token error:', errorBody);
      return new Response(
        JSON.stringify({ error: 'Failed to get Brick token', details: errorBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const tokenData = await tokenResponse.json();

    // Brick returns a public token and a redirect URL for the Link widget
    return new Response(
      JSON.stringify({
        publicToken: tokenData.data?.accessToken || tokenData.accessToken,
        redirectUrl: tokenData.data?.redirectUrl || `${BRICK_BASE_URL}/widget`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('brick-token error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
