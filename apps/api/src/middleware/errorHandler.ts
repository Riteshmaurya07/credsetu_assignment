import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { getEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { toFieldIssues } from './validate.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(404, 'ROUTE_NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}.`),
  );
}

/**
 * Central error handler.
 *
 * Every error leaves the API in the same shape:
 * `{ success: false, error: { code, message, details? } }`
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    const issues = toFieldIssues(error);
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message ?? 'The request payload is invalid.',
        details: issues,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(`[${error.code}] ${error.message}`, error);
    }
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.expose ? error.message : 'Something went wrong. Please try again.',
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    });
    return;
  }

  // Malformed JSON bodies raised by express.json()
  if (
    error instanceof SyntaxError &&
    'body' in (error as unknown as Record<string, unknown>)
  ) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' },
    });
    return;
  }

  // Payload too large (multer / express.json)
  const maybeLimit = error as { type?: string; status?: number };
  if (maybeLimit?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The uploaded file is too large.' },
    });
    return;
  }

  logger.error('Unhandled error', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: getEnv().isProduction
        ? 'Something went wrong. Please try again.'
        : `Unhandled error: ${(error as Error)?.message ?? String(error)}`,
    },
  });
}
