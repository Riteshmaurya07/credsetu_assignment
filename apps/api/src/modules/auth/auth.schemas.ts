import { z } from 'zod';
import { normalizePhone } from '../../utils/phone.js';

export const requestOtpSchema = z.object({
  phone: z
    .string({ error: 'Phone number is required.' })
    .trim()
    .min(1, 'Phone number is required.')
    .refine(
      (value) => normalizePhone(value).ok,
      'Enter a valid phone number, for example 9876543210.',
    ),
  countryCode: z
    .string()
    .trim()
    .length(2, 'countryCode must be a 2 letter ISO country code.')
    .optional(),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string({ error: 'Phone number is required.' })
    .trim()
    .min(1, 'Phone number is required.'),
  code: z
    .string({ error: 'Verification code is required.' })
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
  countryCode: z
    .string()
    .trim()
    .length(2, 'countryCode must be a 2 letter ISO country code.')
    .optional(),
});

export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
