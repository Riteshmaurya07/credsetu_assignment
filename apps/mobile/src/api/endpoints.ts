import { apiRequest, ApiError, getBaseUrl } from './client';
import type {
  Loan,
  LoanSummary,
  LoansResponse,
  RequestOtpResponse,
  VerifyOtpResponse,
} from '../types/api';

/** Requests a mock OTP for the given phone number. */
export async function requestOtp(
  phone: string,
  countryCode: string,
): Promise<RequestOtpResponse> {
  return apiRequest<RequestOtpResponse>('/api/auth/request-otp', {
    method: 'POST',
    body: { phone, countryCode },
  });
}

/** Verifies the OTP and returns the access token plus the user. */
export async function verifyOtp(
  phone: string,
  code: string,
  countryCode: string,
): Promise<VerifyOtpResponse> {
  return apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone, code, countryCode },
  });
}

/** Lists the loans of the signed-in user. */
export async function fetchLoans(token: string): Promise<Loan[]> {
  const response = await apiRequest<LoansResponse>('/api/loans', { token });
  return response.loans;
}

/** Fetches the aggregated summary of the signed-in user. */
export async function fetchSummary(token: string): Promise<LoanSummary> {
  return apiRequest<LoanSummary>('/api/loans/summary', { token });
}

/** Creates a loan for the signed-in user. */
export async function createLoan(
  token: string,
  input: { friendName: string; amount: string; dueDate: string },
): Promise<Loan> {
  const response = await apiRequest<{ loan: Loan }>('/api/loans', {
    method: 'POST',
    body: input,
    token,
  });
  return response.loan;
}

/** Marks an owned pending loan as repaid. */
export async function repayLoan(token: string, loanId: string): Promise<Loan> {
  const response = await apiRequest<{ loan: Loan }>(`/api/loans/${loanId}/repay`, {
    method: 'PATCH',
    token,
  });
  return response.loan;
}

/**
 * Uploads a receipt image for a loan.
 * The file is sent as multipart form data.
 */
export async function uploadReceipt(
  token: string,
  loanId: string,
  asset: { uri: string; name: string; type: string },
): Promise<Loan> {
  const form = new FormData();
  form.append('receipt', {
    uri: asset.uri,
    name: asset.name,
    type: asset.type,
  } as unknown as Blob);

  const response = await fetch(`${getBaseUrl()}/api/loans/${loanId}/receipt`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const payload = parsed as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'UPLOAD_FAILED',
      payload?.error?.message ?? 'The receipt could not be uploaded.',
    );
  }

  const envelope = parsed as { data?: { loan?: Loan } };
  if (!envelope.data?.loan) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The upload response was unexpected.');
  }
  return envelope.data.loan;
}
