-- ============================================================
-- Nekofi Database Schema — Open Banking Integration
-- ============================================================
-- Adds support for automated bank/e-wallet connections via Brick (onebrick.io).
-- Creates linked_accounts, extends transactions, and adds webhook audit log.

-- ──────────────────────────────────────────
-- linked_accounts
-- Stores the aggregator connection metadata for each linked bank/e-wallet.
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.linked_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id      TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    provider        TEXT NOT NULL DEFAULT 'brick' CHECK (provider IN ('brick')),
    institution_id  TEXT NOT NULL,          -- Brick's institution identifier
    institution_name TEXT NOT NULL,         -- Human-readable name (e.g. "GCash", "BDO")
    access_token    TEXT NOT NULL,          -- Brick access token for this connection
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    last_synced_at  TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_linked_accounts_user_id ON public.linked_accounts(user_id);
CREATE INDEX idx_linked_accounts_account_id ON public.linked_accounts(account_id);

-- ──────────────────────────────────────────
-- Extend transactions table
-- Add columns to track which account a transaction belongs to,
-- where it came from, and an external ID for deduplication.
-- ──────────────────────────────────────────
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'brick_sync', 'brick_webhook'));

ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Unique constraint on external_id for deduplication (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_id
    ON public.transactions(external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
    ON public.transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_transactions_source
    ON public.transactions(source);

-- ──────────────────────────────────────────
-- aggregator_webhook_log
-- Raw audit log of every webhook payload received.
-- Useful for debugging and replay.
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aggregator_webhook_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider    TEXT NOT NULL DEFAULT 'brick',
    event_type  TEXT NOT NULL,
    payload     JSONB NOT NULL,
    status      TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_log_provider ON public.aggregator_webhook_log(provider);
CREATE INDEX idx_webhook_log_created_at ON public.aggregator_webhook_log(created_at DESC);

-- ──────────────────────────────────────────
-- Row Level Security (RLS)
-- ──────────────────────────────────────────

-- linked_accounts: users can only access their own
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linked accounts"
    ON public.linked_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own linked accounts"
    ON public.linked_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linked accounts"
    ON public.linked_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own linked accounts"
    ON public.linked_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Service role bypass for Edge Functions (webhooks insert data on behalf of users)
CREATE POLICY "Service role can manage linked accounts"
    ON public.linked_accounts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- aggregator_webhook_log: only service role can write, no user access needed
ALTER TABLE public.aggregator_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook logs"
    ON public.aggregator_webhook_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow service role to insert transactions via webhooks
-- (The existing "Users can manage own transactions" policy handles normal user access)
CREATE POLICY "Service role can manage transactions"
    ON public.transactions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Allow service role to update account balances via webhooks
CREATE POLICY "Service role can manage accounts"
    ON public.accounts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
