import { z } from 'zod';
import { isValidDateString } from '../../utils/dates.js';
import { parseAmountToDecimalString } from '../../utils/money.js';

const amountSchema = z
  .union([z.string(), z.number()], {
    error: 'Amount is required.',
  })
  .transform((value, ctx) => {
    const parsed = parseAmountToDecimalString(value);
    if (parsed === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'Amount must be a positive number with at most 2 decimal places.',
      });
      return z.NEVER;
    }
    return parsed;
  });

export const createLoanSchema = z.object({
  friendName: z
    .string({ error: 'Friend name is required.' })
    .trim()
    .min(1, 'Friend name is required.')
    .max(80, 'Friend name must be 80 characters or fewer.'),
  amount: amountSchema,
  dueDate: z
    .string({ error: 'Due date is required.' })
    .trim()
    .refine(isValidDateString, 'Due date must be a valid date in YYYY-MM-DD format.'),
});

export type CreateLoanBody = z.infer<typeof createLoanSchema>;
