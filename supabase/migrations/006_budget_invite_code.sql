-- ============================================================
-- Nekofi Database Schema — Budget Invite Codes
-- ============================================================

-- ──────────────────────────────────────────
-- Add invite_code to budgets
-- ──────────────────────────────────────────
ALTER TABLE public.budgets ADD COLUMN invite_code TEXT;

CREATE INDEX idx_budgets_invite_code ON public.budgets(invite_code);

-- ──────────────────────────────────────────
-- RPCs for Invite Codes
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.regenerate_budget_invite_code(p_budget_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM public.budgets WHERE name = p_budget_name AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Budget group not found or you are not the owner';
    END IF;

    -- Generate a unique 6-character alphanumeric code
    LOOP
        v_code := upper(substring(md5(random()::text) from 1 for 6));
        -- Check if code exists for a DIFFERENT budget group
        SELECT EXISTS (
            SELECT 1 FROM public.budgets 
            WHERE invite_code = v_code AND (name != p_budget_name OR user_id != auth.uid())
        ) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;

    UPDATE public.budgets
    SET invite_code = v_code, updated_at = NOW()
    WHERE name = p_budget_name AND user_id = auth.uid();

    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.preview_budget_by_code(p_invite_code TEXT)
RETURNS TABLE (budget_name TEXT, owner_name TEXT, owner_avatar_url TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT b.name, p.name, p.avatar_url
    FROM public.budgets b
    JOIN public.profiles p ON b.user_id = p.id
    WHERE b.invite_code = p_invite_code
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.join_budget_by_code(p_invite_code TEXT)
RETURNS void AS $$
DECLARE
    v_owner_id UUID;
    v_budget_name TEXT;
BEGIN
    -- Find the budget owner and name by code
    SELECT user_id, name INTO v_owner_id, v_budget_name
    FROM public.budgets
    WHERE invite_code = p_invite_code
    LIMIT 1;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation code';
    END IF;

    IF v_owner_id = auth.uid() THEN
        RAISE EXCEPTION 'You are already the owner of this budget';
    END IF;

    -- Insert current user as an accepted collaborator for all categories in this budget group
    INSERT INTO public.budget_members (budget_id, user_id, role, status)
    SELECT id, auth.uid(), 'collaborator', 'accepted'
    FROM public.budgets
    WHERE name = v_budget_name AND user_id = v_owner_id
    ON CONFLICT (budget_id, user_id) DO UPDATE SET status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
