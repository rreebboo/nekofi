import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Deep link handler for nekofi://bank-connect/error
 *
 * Brankas Tap UI redirects here when the bank login fails
 * or the user cancels. We redirect back to the connect screen
 * which will show the error state.
 */
export default function BankConnectError() {
  const router = useRouter();

  useEffect(() => {
    router.back();
  }, []);

  return null;
}
