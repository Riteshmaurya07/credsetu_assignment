import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodError, ZodType } from 'zod';
import { validationError } from '../errors/AppError.js';

/**
 * Wraps an async handler so rejected promises are forwarded to the Express
 * error middleware instead of becoming unhandled rejections.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export interface FieldIssue {
  field: string;
  message: string;
}

/** Converts a ZodError into the API error detail format. */
export function toFieldIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

/**
 * Validates and replaces `req.body` with the parsed (and coerced) payload.
 * Unknown keys are stripped so a client cannot smuggle extra fields such as
 * `userId` into a service.
 */
export function validateBody<T extends ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issues = toFieldIssues(result.error);
      const message = issues[0]?.message ?? 'The request payload is invalid.';
      next(validationError(message, issues));
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Validates `req.params` against a schema and replaces it with the parsed value. */
export function validateParams<T extends ZodType>(schema: T): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params ?? {});
    if (!result.success) {
      const issues = toFieldIssues(result.error);
      const message = issues[0]?.message ?? 'The request parameters are invalid.';
      next(validationError(message, issues));
      return;
    }
    req.params = result.data as typeof req.params;
    next();
  };
}
