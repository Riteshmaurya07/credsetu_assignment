import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, getBaseUrl } from '../client';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('getBaseUrl', () => {
  const original = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
  });

  it('uses the configured URL without a trailing slash', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.20:4000/';
    expect(getBaseUrl()).toBe('http://192.168.1.20:4000');
  });

  it('falls back to the Android emulator host', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    expect(getBaseUrl()).toBe('http://10.0.2.2:4000');
  });
});

describe('apiRequest', () => {
  const original = process.env.EXPO_PUBLIC_API_URL;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
  });

  it('unwraps the data payload of the success envelope', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { id: 'loan-1' } }));

    const result = await apiRequest<{ id: string }>('/api/loans/loan-1');

    expect(result).toEqual({ id: 'loan-1' });
  });

  it('sends JSON bodies and the bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: { ok: true } }));

    await apiRequest('/api/loans', { method: 'POST', body: { amount: '10.00' }, token: 'jwt-123' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/loans');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-123');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ amount: '10.00' });
  });

  it('maps an error envelope onto an ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid amount.' } },
        422,
      ),
    );

    await expect(apiRequest('/api/loans')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Invalid amount.',
    });
  });

  it('flags a 401 as an unauthorised error', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Nope.' } }, 401),
    );

    const error = await apiRequest('/api/loans', { token: 'bad' }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isUnauthorized).toBe(true);
  });

  it('turns a network failure into a readable error', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));

    const error = await apiRequest('/api/health').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
    expect((error as ApiError).isNetworkError).toBe(true);
  });

  it('reports an unreadable body as an invalid response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'not json',
    } as unknown as Response);

    await expect(apiRequest('/api/health')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
