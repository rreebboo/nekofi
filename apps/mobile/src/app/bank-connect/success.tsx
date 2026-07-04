import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

/**
 * Deep link handler for nekofi://bank-connect/success
 *
 * Brankas Tap UI redirects here after the user successfully
 * completes bank login. We redirect back to the connect screen
 * which is already polling for sync results.
 */
export default function BankConnectSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // The connect.tsx screen's Linking listener will also fire,
    // but if we landed here via Expo Router, just go back to
    // the previous screen (connect.tsx) which handles the sync.
    router.back();
  }, []);

  return null;
}
