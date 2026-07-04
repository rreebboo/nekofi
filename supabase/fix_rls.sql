-- 1. Create SECURITY DEFINER functions to bypass RLS and break circular dependency

CREATE OR REPLACE FUNCTION public.is_budget_owner(check_budget_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = check_budget_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_budget_member(check_budget_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.budget_members
    WHERE budget_id = check_budget_id AND user_id = auth.uid() AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix budget_members policies
DROP POLICY IF EXISTS "Users can view budget_members" ON public.budget_members;
CREATE POLICY "Users can view budget_members" ON public.budget_members
FOR SELECT USING (
  user_id = auth.uid() OR public.is_budget_owner(budget_id)
);

-- 3. Fix budgets policies
DROP POLICY IF EXISTS "Users can update budgets" ON public.budgets;
CREATE POLICY "Users can update budgets" ON public.budgets
FOR UPDATE USING (
  user_id = auth.uid() OR public.is_budget_member(id)
);

DROP POLICY IF EXISTS "Users can view budgets" ON public.budgets;
CREATE POLICY "Users can view budgets" ON public.budgets
FOR SELECT USING (
  user_id = auth.uid() OR public.is_budget_member(id)
);

-- 4. Fix transactions policies
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
CREATE POLICY "Users can view transactions" ON public.transactions
FOR SELECT USING (
  user_id = auth.uid() OR (budget_id IS NOT NULL AND (public.is_budget_owner(budget_id) OR public.is_budget_member(budget_id)))
);

DROP POLICY IF EXISTS "Users can update transactions" ON public.transactions;
CREATE POLICY "Users can update transactions" ON public.transactions
FOR UPDATE USING (
  user_id = auth.uid() OR (budget_id IS NOT NULL AND (public.is_budget_owner(budget_id) OR public.is_budget_member(budget_id)))
);

DROP POLICY IF EXISTS "Users can delete transactions" ON public.transactions;
CREATE POLICY "Users can delete transactions" ON public.transactions
FOR DELETE USING (
  user_id = auth.uid() OR (budget_id IS NOT NULL AND (public.is_budget_owner(budget_id) OR public.is_budget_member(budget_id)))
);
