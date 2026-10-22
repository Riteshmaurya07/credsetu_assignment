import * as SecureStore from 'expo-secure-store';
import type { User } from '../types/api';

/**
 * Session persistence.
 *
 * The JWT is stored in the device keychain / keystore through Expo
 * SecureStore - it is never written to AsyncStorage or to plain files.
 */

const TOKEN_KEY = 'miniledger.accessToken';
const USER_KEY = 'miniledger.user';

export interface StoredSession {
  token: string;
  user: User;
}

function isSecureStoreAvailable(): boolean {
  // SecureStore is not available on web; the app targets Android/iOS.
  return typeof SecureStore.setItemAsync === 'function';
}

export async function saveSession(session: StoredSession): Promise<void> {
  if (!isSecureStoreAvailable()) return;
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function loadSession(): Promise<StoredSession | null> {
  if (!isSecureStoreAvailable()) return null;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return null;
    const rawUser = await SecureStore.getItemAsync(USER_KEY);
    if (!rawUser) return null;
    const user = JSON.parse(rawUser) as User;
    if (!user?.id || !user?.phone) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  if (!isSecureStoreAvailable()) return;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    // Deleting a missing key is not an error.
  }
}
