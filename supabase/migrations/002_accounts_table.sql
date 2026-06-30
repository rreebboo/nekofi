-- ============================================================
-- Nekofi Database Schema — Accounts Migration
-- ============================================================

-- ──────────────────────────────────────────
-- accounts
-- ──────────────────────────────────────────
DROP TABLE IF EXISTS public.accounts CASCADE;

CREATE TABLE public.accounts (
    id             TEXT PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    type           TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('bank', 'wallet', 'cash')),
    brand_icon     TEXT NOT NULL DEFAULT 'card-outline',
    balance        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency       CHAR(3) NOT NULL DEFAULT 'PHP',
    color          TEXT NOT NULL DEFAULT '#1A1A1A',
    gradient_end   TEXT NOT NULL DEFAULT '#333333',
    text_color     TEXT NOT NULL DEFAULT '#FFFFFF',
    number_masked  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);

-- ──────────────────────────────────────────
-- Row Level Security (RLS)
-- ──────────────────────────────────────────
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- accounts: users only access their own
CREATE POLICY "Users can manage own accounts" ON public.accounts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
