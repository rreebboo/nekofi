import { supabase } from './supabase/client';

const BRANKAS_TOKEN_FUNCTION = 'brankas-token';
const BRANKAS_SYNC_FUNCTION = 'brankas-sync';

// ─── Typed Error ───

export type BankServiceErrorCode =
  | 'credentials_missing'  // Brankas API keys not configured on the server
  | 'provider_error'       // Brankas API returned an error
  | 'network_error'        // Network/connectivity issue
  | 'auth_error'           // User not authenticated
  | 'unknown';             // Catch-all

export class BankServiceError extends Error {
  code: BankServiceErrorCode;
  details?: string;
  userMessage: string;

  constructor(code: BankServiceErrorCode, userMessage: string, details?: string) {
    super(userMessage);
    this.name = 'BankServiceError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }

  /** Whether the user should be guided to the manual-add flow instead of retrying. */
  get shouldFallbackToManual(): boolean {
    return this.code === 'credentials_missing' || this.code === 'auth_error';
  }
}

// ─── Response Types ───

export interface BrankasTokenResponse {
  redirectUrl: string;
  statementId: string;
}

export interface BrankasSyncResponse {
  status: string;
  syncedTransactions?: number;
  balance?: number;
  bankName?: string;
  statementId?: string;
  message?: string;
}

// ─── Helpers ───

/**
 * Extracts a meaningful error from a Supabase Functions error.
 * `supabase.functions.invoke()` returns `error` as a FunctionsHttpError
 * whose `.message` is often just "non-2xx status code". The actual error
 * details from our Edge Function are in the response body (`data`).
 */
async function parseFunctionsError(
  error: any,
  data: any,
): Promise<{ code: BankServiceErrorCode; message: string; details?: string }> {
  // The Supabase client sets `data = null` on non-2xx and puts the
  // response body in `error.context`. Try to extract it.
  let body: any = data;

  if (!body && error?.context) {
    try {
      // error.context may be a Response object (needs .json()) or already parsed
      if (typeof error.context.json === 'function') {
        body = await error.context.json();
      } else if (typeof error.context === 'object') {
        body = error.context;
      }
    } catch {
      // Could not parse context — fall through to generic handling
    }
  }

  // Now check if we have a structured error from our Edge Function
  if (body && typeof body === 'object' && body.error) {
    // Try to get the HTTP status from the error or context
    const status =
      error?.context?.status ||  // Response object's status
      error?.status ||
      0;

    // Map HTTP status codes to our error codes
    let code: BankServiceErrorCode = 'unknown';
    if (status === 503) {
      code = 'credentials_missing';
    } else if (status === 401) {
      code = 'auth_error';
    } else if (status === 502) {
      code = 'provider_error';
    } else if (status >= 500) {
      code = 'unknown';
    }

    return {
      code,
      message: body.error,
      details: body.details,
    };
  }

  // Fallback: try to parse the error message itself
  const msg = error?.message || 'An unexpected error occurred';

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
    return { code: 'network_error', message: 'Network error. Please check your connection.' };
  }

  return { code: 'unknown', message: msg };
}

// ─── Service ───

export const bankService = {
  /**
   * Initialize a Brankas Statement session via our Edge Function.
   * Returns a `redirectUrl` to open in a browser/WebBrowser for the
   * user to securely log into their bank via the Brankas Tap UI.
   */
  async initConnection(institutionName: string): Promise<BrankasTokenResponse> {
    const { data, error } = await supabase.functions.invoke(BRANKAS_TOKEN_FUNCTION, {
      body: { institutionName },
    });

    if (error) {
      const parsed = await parseFunctionsError(error, data);
      console.error(`[BankService] initConnection failed (${parsed.code}):`, parsed.message, parsed.details);
      throw new BankServiceError(parsed.code, parsed.message, parsed.details);
    }

    if (!data?.redirectUrl) {
      throw new BankServiceError(
        'provider_error',
        'No connection URL received. Please try again.',
      );
    }

    return data as BrankasTokenResponse;
  },

  /**
   * Poll or trigger sync for a completed Brankas statement.
   * Call this after the user returns from the Tap UI to fetch
   * and insert transactions into the database.
   */
  async syncStatement(statementId: string, userId: string): Promise<BrankasSyncResponse> {
    const { data, error } = await supabase.functions.invoke(BRANKAS_SYNC_FUNCTION, {
      body: { statementId, userId },
    });

    if (error) {
      const parsed = await parseFunctionsError(error, data);
      console.error(`[BankService] syncStatement failed (${parsed.code}):`, parsed.message, parsed.details);
      throw new BankServiceError(parsed.code, parsed.message, parsed.details);
    }

    return data as BrankasSyncResponse;
  },

  /**
   * Lightweight check: can we successfully reach the Brankas token endpoint?
   * Returns true if the Edge Function + Brankas API are both working.
   * Useful for pre-disabling the "Connect" button when Brankas isn't configured.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke(BRANKAS_TOKEN_FUNCTION, {
        body: { institutionName: '__healthcheck__' },
      });
      // If we got a redirectUrl, the service is operational
      return !error && !!data?.redirectUrl;
    } catch {
      return false;
    }
  },
};
