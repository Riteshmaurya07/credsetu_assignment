import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../errors/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

/**
 * Requires a valid `Authorization: Bearer <jwt>` header.
 * The authenticated user id always comes from the token - never from the
 * request body or query string.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? '';
  const match = BEARER_PATTERN.exec(header.trim());
  if (!match || !match[1]) {
    next(unauthorized('Sign in to continue.', 'TOKEN_MISSING'));
    return;
  }
  try {
    const verified = verifyAccessToken(match[1].trim());
    req.auth = { userId: verified.userId, phone: verified.phone };
    next();
  } catch (error) {
    next(error);
  }
}

/** Returns the authenticated user id or throws - used inside route handlers. */
export function requireUserId(req: Request): string {
  if (!req.auth) {
    throw unauthorized('Sign in to continue.', 'TOKEN_MISSING');
  }
  return req.auth.userId;
}
