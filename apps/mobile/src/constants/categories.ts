export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', emoji: '🍜' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'health', label: 'Health', emoji: '💊' },
  { id: 'utilities', label: 'Utilities', emoji: '⚡' },
  { id: 'rent', label: 'Rent / Housing', emoji: '🏠' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'subscriptions', label: 'Subscriptions', emoji: '📱' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'gifts', label: 'Gifts', emoji: '🎁' },
  { id: 'other', label: 'Other', emoji: '💸' },
] as const;

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', emoji: '💼' },
  { id: 'freelance', label: 'Freelance', emoji: '💻' },
  { id: 'business', label: 'Business', emoji: '🏢' },
  { id: 'investment', label: 'Investment', emoji: '📈' },
  { id: 'gift_received', label: 'Gift Received', emoji: '🎁' },
  { id: 'other_income', label: 'Other Income', emoji: '💰' },
] as const;

export type ExpenseCategoryId = typeof EXPENSE_CATEGORIES[number]['id'];
export type IncomeCategoryId = typeof INCOME_CATEGORIES[number]['id'];

export const CURRENCIES = ['PHP', 'USD', 'EUR', 'JPY', 'SGD', 'AUD'] as const;
export type Currency = typeof CURRENCIES[number];

export const DEFAULT_CURRENCY: Currency = 'PHP';
