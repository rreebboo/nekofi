/**
 * MockAuthService
 *
 * A fully simulated authentication service for academic/demo purposes.
 * No real API calls are made. No real credentials are validated.
 * No real OTPs are sent or verified.
 *
 * ⚠️  For demonstration use only.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MockToken {
  accessToken: string;
  provider: string;
  expiresIn: number;
}

export interface MockBalance {
  amount: number;
  currency: string;
  formattedAmount: string;
}

export interface MockTransaction {
  id: string;
  label: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
  icon: string;
}

export interface OTPSendResult {
  success: true;
  maskedIdentifier: string;
}

export interface OTPVerifyResult {
  success: boolean;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simulate async delay */
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Random integer between min and max (inclusive) */
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Format Philippine peso */
const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Mask identifier (phone or username) for display */
function maskIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  // Phone: show last 4 digits, mask the rest
  const phoneMatch = trimmed.match(/^(\+?63|0)(\d+)$/);
  if (phoneMatch) {
    const digits = phoneMatch[2];
    const masked = digits.slice(0, -4).replace(/\d/g, '*');
    return '0' + masked + digits.slice(-4);
  }
  // Username/ID: mask middle portion
  if (trimmed.length <= 4) return '****';
  const visible = trimmed.slice(0, 2) + '*'.repeat(trimmed.length - 4) + trimmed.slice(-2);
  return visible;
}

// ─── Mock Transaction Pool ────────────────────────────────────────────────────

const TRANSACTION_POOL = [
  { label: 'FoodPanda', amount: -349, category: 'Food & Dining', icon: '🍔' },
  { label: 'Grab', amount: -187, category: 'Transport', icon: '🚗' },
  { label: 'Shopee', amount: -542, category: 'Shopping', icon: '🛍️' },
  { label: 'Lazada', amount: -899, category: 'Shopping', icon: '📦' },
  { label: 'Netflix', amount: -549, category: 'Entertainment', icon: '🎬' },
  { label: 'Smart Prepaid', amount: -300, category: 'Utilities', icon: '📱' },
  { label: 'Jollibee', amount: -215, category: 'Food & Dining', icon: '🍟' },
  { label: 'Mercury Drug', amount: -180, category: 'Health', icon: '💊' },
  { label: 'Salary', amount: 18000, category: 'Income', icon: '💼' },
  { label: 'Freelance Payment', amount: 5500, category: 'Income', icon: '💻' },
  { label: 'GCash Cash-in', amount: 2000, category: 'Transfer', icon: '📲' },
  { label: 'Meralco', amount: -1250, category: 'Utilities', icon: '⚡' },
  { label: 'PLDT Fiber', amount: -1399, category: 'Utilities', icon: '🌐' },
  { label: '7-Eleven', amount: -88, category: 'Food & Dining', icon: '🏪' },
  { label: 'Spotify', amount: -129, category: 'Entertainment', icon: '🎵' },
  { label: 'Grab Food', amount: -456, category: 'Food & Dining', icon: '🛵' },
  { label: 'Puregold', amount: -1204, category: 'Groceries', icon: '🛒' },
  { label: 'SM Supermarket', amount: -890, category: 'Groceries', icon: '🏬' },
];

/** Generate a random date within the last 30 days */
function randomRecentDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, 30));
  return d.toISOString().split('T')[0];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const MockAuthService = {
  /**
   * Simulate sending an OTP to the given identifier.
   * Always succeeds after 1 second.
   */
  async sendOTP(provider: string, identifier: string): Promise<OTPSendResult> {
    await delay(1000);
    return {
      success: true,
      maskedIdentifier: maskIdentifier(identifier),
    };
  },

  /**
   * Simulate verifying an OTP.
   * Succeeds if the code is exactly 6 digits.
   * No fixed code — any 6-digit number is accepted.
   */
  async verifyOTP(provider: string, code: string): Promise<OTPVerifyResult> {
    await delay(1500);
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      return { success: true };
    }
    return { success: false, error: 'Invalid OTP. Please try again.' };
  },

  /**
   * Generate a mock access token for the given provider.
   */
  generateMockToken(provider: string): MockToken {
    const slug = provider.toLowerCase().replace(/\s+/g, '_');
    return {
      accessToken: `mock_${slug}_token_${Date.now()}`,
      provider,
      expiresIn: 3600,
    };
  },

  /**
   * Fetch a randomized mock balance.
   * Returns between ₱5,000 and ₱50,000 with cents.
   */
  async fetchMockBalance(provider: string): Promise<MockBalance> {
    await delay(randInt(500, 1000));
    const pesos = randInt(5000, 50000);
    const cents = randInt(0, 99);
    const amount = pesos + cents / 100;
    return {
      amount,
      currency: 'PHP',
      formattedAmount: formatPeso(amount),
    };
  },

  /**
   * Fetch a randomized list of mock transactions.
   * Returns 5–8 randomly selected entries from the pool,
   * sorted by date (most recent first).
   */
  async fetchMockTransactions(provider: string): Promise<MockTransaction[]> {
    await delay(randInt(500, 1000));

    // Pick a random subset
    const count = randInt(5, 8);
    const shuffled = [...TRANSACTION_POOL].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, count);

    return picked
      .map((t, i) => ({
        id: `mock-txn-${i}-${Date.now()}`,
        label: t.label,
        amount: t.amount,
        type: (t.amount > 0 ? 'income' : 'expense') as 'income' | 'expense',
        date: randomRecentDate(),
        category: t.category,
        icon: t.icon,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
};
