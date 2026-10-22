/** Shared API types - these mirror the JSON contract of the MiniLedger API. */

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorPayload {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface User {
  id: string;
  phone: string;
  createdAt: string;
}

export type LoanStatus = 'pending' | 'repaid';

export interface Loan {
  id: string;
  friendName: string;
  /** Exact decimal string, e.g. `"1500.50"`. */
  amount: string;
  /** Calendar date `YYYY-MM-DD`. */
  dueDate: string;
  status: LoanStatus;
  isOverdue: boolean;
  daysOverdue: number;
  receiptPath: string | null;
  repaidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSummary {
  totalLent: string;
  totalRepaid: string;
  overdueAmount: string;
  pendingAmount: string;
  loanCount: number;
  pendingCount: number;
  repaidCount: number;
  overdueCount: number;
}

export interface RequestOtpResponse {
  phone: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
  message: string;
}

export interface VerifyOtpResponse {
  token: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: User;
}

export interface LoansResponse {
  loans: Loan[];
  count: number;
}

export interface CountryOption {
  iso: string;
  name: string;
  dialCode: string;
  /** Length of the national number (without the country code). */
  nationalLength: number;
}

/** Country codes offered by the phone entry screen. */
export const COUNTRIES: CountryOption[] = [
  { iso: 'IN', name: 'India', dialCode: '91', nationalLength: 10 },
  { iso: 'US', name: 'United States', dialCode: '1', nationalLength: 10 },
  { iso: 'GB', name: 'United Kingdom', dialCode: '44', nationalLength: 10 },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '971', nationalLength: 9 },
  { iso: 'AU', name: 'Australia', dialCode: '61', nationalLength: 9 },
  { iso: 'SG', name: 'Singapore', dialCode: '65', nationalLength: 8 },
  { iso: 'CA', name: 'Canada', dialCode: '1', nationalLength: 10 },
];
