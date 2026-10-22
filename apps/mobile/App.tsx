import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { LedgerProvider } from './src/ledger/LedgerContext';
import { RootNavigator } from './src/navigation/RootNavigator';

/**
 * MiniLedger app root.
 *
 * Provider order matters:
 *  - `SafeAreaProvider` gives the safe area insets to every screen
 *  - `AuthProvider` owns the session and the token
 *  - `LedgerProvider` needs the token, so it is nested inside the auth provider
 */
export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LedgerProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </LedgerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
