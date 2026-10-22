import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../api/client';
import { requestOtp, verifyOtp } from '../api/endpoints';
import type { User } from '../types/api';
import { clearSession, loadSession, saveSession } from './tokenStorage';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  /** Sends a mock OTP and returns the canonical phone number. */
  sendOtp: (phone: string, countryCode: string) => Promise<string>;
  /** Verifies the OTP, persists the session and signs the user in. */
  confirmOtp: (phone: string, code: string, countryCode: string) => Promise<void>;
  /** Signs the user out and removes the stored token. */
  logout: () => Promise<void>;
  /** Called by the API client when the server rejects the session. */
  handleSessionExpired: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Restore a persisted session on start up.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadSession();
      if (cancelled) return;
      if (stored) {
        setToken(stored.token);
        setUser(stored.user);
      }
      setStatus(stored ? 'authenticated' : 'unauthenticated');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendOtp = useCallback(async (phone: string, countryCode: string) => {
    const response = await requestOtp(phone, countryCode);
    return response.phone;
  }, []);

  const confirmOtp = useCallback(async (phone: string, code: string, countryCode: string) => {
    const response = await verifyOtp(phone, code, countryCode);
    const session = { token: response.token, user: response.user };
    await saveSession(session);
    setToken(session.token);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const handleSessionExpired = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, token, user, sendOtp, confirmOtp, logout, handleSessionExpired }),
    [status, token, user, sendOtp, confirmOtp, logout, handleSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return context;
}

/** Extracts a user friendly message from an unknown error. */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
