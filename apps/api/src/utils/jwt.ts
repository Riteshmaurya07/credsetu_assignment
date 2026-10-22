import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import { unauthorized } from '../errors/AppError.js';

export interface AccessTokenPayload {
  /** User id (uuid). */
  sub: string;
  /** Canonical phone number of the user. */
  phone: string;
}

export interface VerifiedToken {
  userId: string;
  phone: string;
  expiresAt: number;
}

/** Signs a JWT access token for the given user. */
export function signAccessToken(user: { id: string; phone: string }): {
  token: string;
  expiresInSeconds: number;
} {
  const env = getEnv();
  const payload: AccessTokenPayload = { sub: user.id, phone: user.phone };
  const token = jwt.sign(payload, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresInSeconds,
  });
  return { token, expiresInSeconds: env.jwtExpiresInSeconds };
}

/**
 * Verifies a JWT access token.
 * @throws AppError 401 when the token is missing, malformed or expired.
 */
export function verifyAccessToken(token: string): VerifiedToken {
  const env = getEnv();
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw unauthorized('Your session is invalid. Please sign in again.', 'TOKEN_INVALID');
    }
    return {
      userId: String(decoded.sub),
      phone: String((decoded as jwt.JwtPayload).phone ?? ''),
      expiresAt: typeof decoded.exp === 'number' ? decoded.exp : 0,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw unauthorized('Your session has expired. Please sign in again.', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw unauthorized('Your session is invalid. Please sign in again.', 'TOKEN_INVALID');
    }
    throw error;
  }
}
