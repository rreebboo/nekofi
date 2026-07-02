-- ============================================================
-- Nekofi Database Schema — Enable Realtime
-- ============================================================

-- Add tables to the built-in supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts, public.budgets, public.transactions;
