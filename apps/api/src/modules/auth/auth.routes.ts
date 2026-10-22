import { Router } from 'express';
import { requestOtpSchema, verifyOtpSchema, type RequestOtpBody, type VerifyOtpBody } from './auth.schemas.js';
import { requestOtp, verifyOtp } from './auth.service.js';
import { asyncHandler, validateBody } from '../../middleware/validate.js';
import { otpRequestPerIpLimiter, otpRequestPerPhoneLimiter, otpVerifyPerIpLimiter } from '../../middleware/rateLimit.js';
import { sendOk } from '../../utils/http.js';

export const authRouter = Router();

/**
 * POST /api/auth/request-otp
 *
 * Generates a six digit code, stores only its hash and prints the plaintext
 * code to the API terminal. The code is deliberately NOT part of the HTTP
 * response.
 */
authRouter.post(
  '/request-otp',
  otpRequestPerPhoneLimiter(),
  otpRequestPerIpLimiter(),
  validateBody(requestOtpSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as RequestOtpBody;
    const result = await requestOtp({ phone: body.phone, countryCode: body.countryCode });
    sendOk(res, {
      phone: result.phone,
      expiresInSeconds: result.expiresInSeconds,
      resendAvailableInSeconds: result.resendAvailableInSeconds,
      message: 'A verification code has been sent. Check the API terminal for the mock code.',
    });
  }),
);

/**
 * POST /api/auth/verify-otp
 *
 * Verifies the code and returns a signed access token plus the safe user
 * details. Invalid, expired, exhausted and reused codes are rejected.
 */
authRouter.post(
  '/verify-otp',
  otpVerifyPerIpLimiter(),
  validateBody(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as VerifyOtpBody;
    const result = await verifyOtp({
      phone: body.phone,
      code: body.code,
      countryCode: body.countryCode,
    });
    sendOk(res, {
      token: result.token,
      tokenType: 'Bearer',
      expiresInSeconds: result.expiresInSeconds,
      user: result.user,
    });
  }),
);
