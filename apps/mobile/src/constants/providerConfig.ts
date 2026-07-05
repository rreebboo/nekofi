/**
 * ProviderConfig
 *
 * Centralizes all provider-specific authentication behavior.
 * Add a new entry here to support a new provider without changing
 * any auth flow logic in connect.tsx.
 */

export type IdentifierType =
  | 'phone'       // Philippine mobile number (09XX / +639XX)
  | 'username'    // Generic alphanumeric username
  | 'phone_or_username'; // Flexible: accepts either

export interface ProviderConfig {
  /** Display name of the provider */
  name: string;
  /** Identifier field type */
  identifierType: IdentifierType;
  /** Label shown above the identifier input */
  identifierLabel: string;
  /** Placeholder text for the identifier input */
  identifierPlaceholder: string;
  /** Whether this provider uses OTP verification */
  usesOTP: boolean;
  /** Brand primary color (falls back to params.color if not set) */
  primaryColor?: string;
  /** Whether the identifier is required to be non-empty (always true) */
  required: true;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  GCash: {
    name: 'GCash',
    identifierType: 'phone',
    identifierLabel: 'Mobile Number',
    identifierPlaceholder: '09XXXXXXXXX',
    usesOTP: true,
    primaryColor: '#0052C2',
    required: true,
  },
  Maya: {
    name: 'Maya',
    identifierType: 'phone',
    identifierLabel: 'Mobile Number',
    identifierPlaceholder: '09XXXXXXXXX',
    usesOTP: true,
    primaryColor: '#00A0DC',
    required: true,
  },
  BDO: {
    name: 'BDO',
    identifierType: 'username',
    identifierLabel: 'Online Banking Username',
    identifierPlaceholder: 'Enter your BDO username',
    usesOTP: true,
    primaryColor: '#002B7F',
    required: true,
  },
  'BDO Unibank': {
    name: 'BDO Unibank',
    identifierType: 'username',
    identifierLabel: 'Online Banking Username',
    identifierPlaceholder: 'Enter your BDO username',
    usesOTP: true,
    primaryColor: '#002B7F',
    required: true,
  },
  BPI: {
    name: 'BPI',
    identifierType: 'username',
    identifierLabel: 'Username',
    identifierPlaceholder: 'Enter your BPI username',
    usesOTP: true,
    primaryColor: '#B00020',
    required: true,
  },
  UnionBank: {
    name: 'UnionBank',
    identifierType: 'phone_or_username',
    identifierLabel: 'Mobile Number or Username',
    identifierPlaceholder: '09XXXXXXXXX or username',
    usesOTP: true,
    primaryColor: '#FF7F00',
    required: true,
  },
  LandBank: {
    name: 'LandBank',
    identifierType: 'username',
    identifierLabel: 'User ID',
    identifierPlaceholder: 'Enter your LandBank User ID',
    usesOTP: true,
    primaryColor: '#00873C',
    required: true,
  },
  GrabPay: {
    name: 'GrabPay',
    identifierType: 'phone',
    identifierLabel: 'Mobile Number',
    identifierPlaceholder: '09XXXXXXXXX',
    usesOTP: true,
    primaryColor: '#00B14F',
    required: true,
  },
};

/** Default config for providers not in the table */
const DEFAULT_CONFIG: Omit<ProviderConfig, 'name' | 'primaryColor'> = {
  identifierType: 'username',
  identifierLabel: 'Username',
  identifierPlaceholder: 'Enter your username',
  usesOTP: true,
  required: true,
};

/**
 * Resolve the ProviderConfig for a given provider name.
 * Falls back to a generic username flow if the provider is not registered.
 */
export function getProviderConfig(providerName: string, fallbackColor?: string): ProviderConfig {
  const known = PROVIDER_CONFIGS[providerName];
  if (known) return known;

  return {
    ...DEFAULT_CONFIG,
    name: providerName,
    primaryColor: fallbackColor,
  };
}

/** Validate a Philippine mobile number. Accepts 09XX or +639XX format. */
export function validatePhoneNumber(value: string): boolean {
  const cleaned = value.replace(/\s/g, '');
  return /^(09\d{9}|\+639\d{9})$/.test(cleaned);
}

/** Normalize a phone number to 09XXXXXXXXX display format */
export function normalizePhone(value: string): string {
  const cleaned = value.replace(/\s/g, '');
  if (cleaned.startsWith('+63')) return '0' + cleaned.slice(3);
  return cleaned;
}
