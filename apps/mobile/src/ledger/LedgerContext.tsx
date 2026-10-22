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
import { createLoan, fetchLoans, fetchSummary, repayLoan } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import type { Loan, LoanSummary } from '../types/api';

interface LedgerContextValue {
  loans: Loan[];
  summary: LoanSummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  /** Reloads the loans and the summary (used on focus and pull to refresh). */
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  /** Creates a loan and refreshes the list and the summary. */
  addLoan: (input: { friendName: string; amount: string; dueDate: string }) => Promise<Loan>;
  /** Marks a loan as repaid and refreshes the list and the summary. */
  markRepaid: (loanId: string) => Promise<Loan>;
}

const EMPTY_SUMMARY: LoanSummary = {
  totalLent: '0.00',
  totalRepaid: '0.00',
  overdueAmount: '0.00',
  pendingAmount: '0.00',
  loanCount: 0,
  pendingCount: 0,
  repaidCount: 0,
  overdueCount: 0,
};

/** Stable empty list so the memoised context value does not change every render. */
const NO_LOANS: Loan[] = [];

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { token, handleSessionExpired } = useAuth();
  const [loansState, setLoans] = useState<Loan[]>(NO_LOANS);
  const [summaryState, setSummary] = useState<LoanSummary | null>(null);
  const [isLoadingState, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!token) return;
      if (!options.silent) setIsLoading(true);
      else setIsRefreshing(true);
      try {
        const [nextLoans, nextSummary] = await Promise.all([
          fetchLoans(token),
          fetchSummary(token),
        ]);
        setLoans(nextLoans);
        setSummary(nextSummary);
        setError(null);
      } catch (caught) {
        if (caught instanceof ApiError && caught.isUnauthorized) {
          await handleSessionExpired();
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : 'The ledger could not be loaded. Please try again.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, handleSessionExpired],
  );

  // Load the ledger as soon as a session becomes available. The state is only
  // touched after the requests resolved, so no render is triggered by the
  // effect itself.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const [nextLoans, nextSummary] = await Promise.all([
          fetchLoans(token),
          fetchSummary(token),
        ]);
        if (cancelled) return;
        setLoans(nextLoans);
        setSummary(nextSummary);
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.isUnauthorized) {
          await handleSessionExpired();
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : 'The ledger could not be loaded. Please try again.',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, handleSessionExpired]);

  const addLoan = useCallback(
    async (input: { friendName: string; amount: string; dueDate: string }) => {
      if (!token) throw new Error('You are signed out. Please sign in again.');
      const loan = await createLoan(token, input);
      await refresh({ silent: true });
      return loan;
    },
    [token, refresh],
  );

  const markRepaid = useCallback(
    async (loanId: string) => {
      if (!token) throw new Error('You are signed out. Please sign in again.');
      const loan = await repayLoan(token, loanId);
      await refresh({ silent: true });
      return loan;
    },
    [token, refresh],
  );

  const value = useMemo<LedgerContextValue>(() => {
    // Without a session there is nothing to show - the empty state is derived
    // instead of being reset through an effect.
    const loans = token ? loansState : NO_LOANS;
    const summary = token ? summaryState : EMPTY_SUMMARY;
    const isLoading = token ? isLoadingState : false;

    return {
      loans,
      summary,
      isLoading,
      isRefreshing,
      error,
      refresh,
      addLoan,
      markRepaid,
    };
  }, [
    token,
    loansState,
    summaryState,
    isLoadingState,
    isRefreshing,
    error,
    refresh,
    addLoan,
    markRepaid,
  ]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used inside a <LedgerProvider>.');
  }
  return context;
}
