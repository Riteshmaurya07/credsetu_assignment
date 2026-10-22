import type { Response } from 'express';

/** Sends the standard success envelope. */
export function sendOk<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}
