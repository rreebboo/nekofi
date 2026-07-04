-- ============================================================
-- Nekofi Database Schema — Shared Budgets
-- ============================================================

-- ──────────────────────────────────────────
-- budget_members
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    budget_id   UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator')),
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(budget_id, user_id)
);

CREATE INDEX idx_budget_members_budget_id ON public.budget_members(budget_id);
CREATE INDEX idx_budget_members_user_id ON public.budget_members(user_id);

ALTER TABLE public.budget_members ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────
-- Update RLS for budgets
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can view budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can insert own budgets" ON public.budgets;

CREATE POLICY "Users can view budgets" ON public.budgets FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM budget_members WHERE budget_id = budgets.id AND user_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Users can update budgets" ON public.budgets FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM budget_members WHERE budget_id = budgets.id AND user_id = auth.uid() AND status = 'accepted')
);

CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (
    auth.uid() = user_id
);

CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

-- ──────────────────────────────────────────
-- Update RLS for transactions
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions" ON public.transactions;

CREATE POLICY "Users can view transactions" ON public.transactions FOR SELECT USING (
    auth.uid() = user_id OR
    (budget_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM budgets WHERE id = transactions.budget_id AND (
            user_id = auth.uid() OR
            EXISTS (SELECT 1 FROM budget_members WHERE budget_id = budgets.id AND user_id = auth.uid() AND status = 'accepted')
        )
    ))
);

CREATE POLICY "Users can insert transactions" ON public.transactions FOR INSERT WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users can update transactions" ON public.transactions FOR UPDATE USING (
    auth.uid() = user_id OR
    (budget_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM budgets WHERE id = transactions.budget_id AND (
            user_id = auth.uid() OR
            EXISTS (SELECT 1 FROM budget_members WHERE budget_id = budgets.id AND user_id = auth.uid() AND status = 'accepted')
        )
    ))
);

CREATE POLICY "Users can delete transactions" ON public.transactions FOR DELETE USING (
    auth.uid() = user_id OR
    (budget_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM budgets WHERE id = transactions.budget_id AND (
            user_id = auth.uid() OR
            EXISTS (SELECT 1 FROM budget_members WHERE budget_id = budgets.id AND user_id = auth.uid() AND status = 'accepted')
        )
    ))
);

-- ──────────────────────────────────────────
-- RLS for budget_members
-- ──────────────────────────────────────────
CREATE POLICY "Users can view budget_members" ON public.budget_members FOR SELECT USING (
    user_id = auth.uid() OR
    budget_id IN (SELECT id FROM budgets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete own pending invites" ON public.budget_members FOR DELETE USING (
    user_id = auth.uid() AND status = 'pending'
);

-- ──────────────────────────────────────────
-- Views
-- ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.pending_budget_invites AS
SELECT
    b.name AS budget_name,
    b.user_id AS owner_id,
    p.name AS owner_name,
    p.avatar_url AS owner_avatar_url,
    m.user_id AS invitee_id,
    MAX(m.created_at) AS invited_at
FROM public.budget_members m
JOIN public.budgets b ON m.budget_id = b.id
JOIN public.profiles p ON b.user_id = p.id
WHERE m.status = 'pending'
GROUP BY b.name, b.user_id, p.name, p.avatar_url, m.user_id;

CREATE OR REPLACE VIEW public.budget_collaborators AS
SELECT
    b.name AS budget_name,
    b.user_id AS owner_id,
    m.user_id AS collaborator_id,
    p.name AS collaborator_name,
    p.avatar_url AS collaborator_avatar_url,
    m.status
FROM public.budget_members m
JOIN public.budgets b ON m.budget_id = b.id
JOIN public.profiles p ON m.user_id = p.id
GROUP BY b.name, b.user_id, m.user_id, p.name, p.avatar_url, m.status;

GRANT SELECT ON public.pending_budget_invites TO authenticated;
GRANT SELECT ON public.budget_collaborators TO authenticated;

-- ──────────────────────────────────────────
-- RPCs
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_user_to_budget(p_budget_name TEXT, p_email TEXT)
RETURNS void AS $$
DECLARE
    v_invitee_id UUID;
    v_budgets_found INT;
BEGIN
    SELECT id INTO v_invitee_id FROM auth.users WHERE email = p_email;
    IF v_invitee_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_email;
    END IF;

    IF v_invitee_id = auth.uid() THEN
        RAISE EXCEPTION 'You cannot invite yourself';
    END IF;

    SELECT COUNT(*) INTO v_budgets_found FROM public.budgets WHERE name = p_budget_name AND user_id = auth.uid();
    IF v_budgets_found = 0 THEN
        RAISE EXCEPTION 'Budget group not found';
    END IF;

    INSERT INTO public.budget_members (budget_id, user_id, role, status)
    SELECT id, v_invitee_id, 'collaborator', 'pending'
    FROM public.budgets
    WHERE name = p_budget_name AND user_id = auth.uid()
    ON CONFLICT (budget_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_budget_invite(p_budget_name TEXT, p_owner_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.budget_members
    SET status = 'accepted', updated_at = NOW()
    WHERE user_id = auth.uid() AND status = 'pending'
    AND budget_id IN (SELECT id FROM public.budgets WHERE name = p_budget_name AND user_id = p_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decline_budget_invite(p_budget_name TEXT, p_owner_id UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM public.budget_members
    WHERE user_id = auth.uid() AND status = 'pending'
    AND budget_id IN (SELECT id FROM public.budgets WHERE name = p_budget_name AND user_id = p_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.remove_budget_member(p_budget_name TEXT, p_owner_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    IF auth.uid() != p_owner_id AND auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    DELETE FROM public.budget_members
    WHERE user_id = p_user_id
    AND budget_id IN (SELECT id FROM public.budgets WHERE name = p_budget_name AND user_id = p_owner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────
-- Update Realtime
-- ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_members;
