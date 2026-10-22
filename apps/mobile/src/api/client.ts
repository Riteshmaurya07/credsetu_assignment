/**
 * Typed HTTP client for the MiniLedger API.
 *
 * Responsibilities:
 *  - a single place for the base URL (read from `EXPO_PUBLIC_API_URL`)
 *  - JSON serialisation / parsing
 *  - attaching the bearer token to protected requests
 *  - turning every failure into a predictable `ApiError`
 */

export const DEFAULT_BASE_URL = 'http://10.0.2.2:4000';

const REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the session is no longer valid and the user has to sign in. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the request could not reach the server at all. */
  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}

/**
 * Returns the API base URL.
 *
 * `EXPO_PUBLIC_API_URL` is inlined by Metro at build time, so it must be
 * written as `EXPO_PUBLIC_API_URL` (no `process.env` indirection).
 *
 * - Android emulator: the host machine is reachable at `10.0.2.2`
 * - iOS simulator: `localhost` works
 * - Physical phone: use the LAN IP of the development computer
 */
export function getBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  const raw = typeof configured === 'string' && configured.trim().length > 0 ? configured.trim() : DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, '');
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  /** Absolute URL of a binary endpoint - bypasses the JSON handling. */
  raw?: boolean;
  timeoutMs?: number;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Performs a request against the API and returns the `data` payload of the
 * success envelope.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      aborted
        ? 'The server took too long to respond. Check your connection and try again.'
        : 'Cannot reach the MiniLedger server. Check that the API is running and that the API URL is correct.',
    );
  }
  clearTimeout(timer);

  const rawBody = await response.text();
  let parsed: unknown = null;
  if (rawBody.length > 0) {
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      if (response.ok) {
        throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server returned an unreadable response.');
      }
      parsed = null;
    }
  }

  if (!response.ok) {
    const payload = parsed as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? `Request failed with status ${response.status}.`,
      payload?.error?.details,
    );
  }

  const envelope = parsed as { success?: boolean; data?: T } | null;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return envelope.data as T;
  }
  return parsed as T;
}
