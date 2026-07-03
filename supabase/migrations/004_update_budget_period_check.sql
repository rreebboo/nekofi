-- Drop the old constraint
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_period_check;

-- Add the new constraint supporting 'custom'
ALTER TABLE public.budgets ADD CONSTRAINT budgets_period_check CHECK (period IN ('custom', 'weekly', 'monthly', 'yearly'));
