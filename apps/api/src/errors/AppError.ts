/**
 * Application error type. Every expected failure raised anywhere in the API is
 * an `AppError`, which guarantees a consistent JSON error payload and HTTP
 * status code.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: { details?: unknown; expose?: boolean } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.expose = options.expose ?? statusCode < 500;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST', details?: unknown): AppError =>
  new AppError(400, code, message, { details });

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError(422, 'VALIDATION_ERROR', message, { details });

export const unauthorized = (message = 'Authentication required.', code = 'UNAUTHORIZED'): AppError =>
  new AppError(401, code, message);

export const forbidden = (message = 'You do not have access to this resource.'): AppError =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (message = 'Resource not found.', code = 'NOT_FOUND'): AppError =>
  new AppError(404, code, message);

export const conflict = (message: string, code = 'CONFLICT'): AppError =>
  new AppError(409, code, message);

export const tooManyRequests = (
  message: string,
  details?: { retryAfterSeconds?: number },
): AppError => new AppError(429, 'RATE_LIMITED', message, { details });

export const internalError = (message = 'Something went wrong. Please try again.'): AppError =>
  new AppError(500, 'INTERNAL_ERROR', message, { expose: false });
