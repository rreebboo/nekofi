-- ============================================================
-- Nekofi Database Schema — Initial Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────
-- profiles
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT '',
    currency    TEXT NOT NULL DEFAULT 'PHP',
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────
-- transactions
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount       NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency     CHAR(3) NOT NULL DEFAULT 'PHP',
    category     TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    date         DATE NOT NULL,
    budget_id    UUID,
    receipt_url  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date    ON public.transactions(date DESC);
CREATE INDEX idx_transactions_type    ON public.transactions(type);

-- ──────────────────────────────────────────
-- budgets
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budgets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    spent       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (spent >= 0),
    currency    CHAR(3) NOT NULL DEFAULT 'PHP',
    period      TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
    start_date  DATE NOT NULL,
    end_date    DATE,
    color       TEXT NOT NULL DEFAULT '#7C6BFF',
    emoji       TEXT NOT NULL DEFAULT '💰',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);

-- ──────────────────────────────────────────
-- Row Level Security (RLS)
-- ──────────────────────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets      ENABLE ROW LEVEL SECURITY;

-- profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- transactions: users only access their own
CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- budgets: users only access their own
CREATE POLICY "Users can manage own budgets" ON public.budgets
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
