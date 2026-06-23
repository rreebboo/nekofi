-- ============================================================
-- Seed Data — Development only
-- ============================================================
-- NOTE: Replace <USER_UUID> with an actual Supabase user ID after creating a test user.

-- Sample transactions
INSERT INTO public.transactions (user_id, type, amount, currency, category, description, date) VALUES
('<USER_UUID>', 'income',  45000.00, 'PHP', 'salary',       'Monthly Salary',          '2026-06-01'),
('<USER_UUID>', 'expense',  1200.00, 'PHP', 'food',         'Dinner at Jollibee',      '2026-06-02'),
('<USER_UUID>', 'expense',   350.00, 'PHP', 'transport',    'Grab to BGC',             '2026-06-03'),
('<USER_UUID>', 'expense',  3500.00, 'PHP', 'shopping',     'SM Megamall haul',        '2026-06-04'),
('<USER_UUID>', 'expense',   199.00, 'PHP', 'subscriptions','Netflix monthly',         '2026-06-05'),
('<USER_UUID>', 'income',   5000.00, 'PHP', 'freelance',    'Logo design project',     '2026-06-10');

-- Sample budget
INSERT INTO public.budgets (user_id, name, category, amount, spent, currency, period, start_date, color, emoji) VALUES
('<USER_UUID>', 'Food & Dining',  'food',      8000.00, 1200.00, 'PHP', 'monthly', '2026-06-01', '#FF6B6B', '🍜'),
('<USER_UUID>', 'Transportation', 'transport', 3000.00,  350.00, 'PHP', 'monthly', '2026-06-01', '#6BB5FF', '🚗'),
('<USER_UUID>', 'Shopping',       'shopping',  5000.00, 3500.00, 'PHP', 'monthly', '2026-06-01', '#A855F7', '🛍️');
