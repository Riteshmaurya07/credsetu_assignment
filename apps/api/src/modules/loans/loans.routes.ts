import { Router } from 'express';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { createLoanSchema, type CreateLoanBody } from './loans.schemas.js';
import { attachReceipt, createLoan, getSummary, listLoans, repayLoan } from './loans.service.js';
import { findLoanByIdForUser } from './loans.repository.js';
import { asyncHandler, validateBody, validateParams } from '../../middleware/validate.js';
import { requireAuth, requireUserId } from '../../middleware/auth.js';
import { sendOk } from '../../utils/http.js';
import { attachReceiptPath, resolveReceiptPath, uploadReceipt } from './loans.upload.js';
import { badRequest, notFound } from '../../errors/AppError.js';

export const loansRouter = Router();

const loanIdParamsSchema = z.object({
  id: z.string().uuid('The loan id is not a valid identifier.'),
});

// Every route below requires a valid access token.
loansRouter.use(requireAuth);

/** GET /api/loans - the loans of the signed-in user. */
loansRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const loans = await listLoans(userId);
    sendOk(res, { loans, count: loans.length });
  }),
);

/** GET /api/loans/summary - aggregated totals for the signed-in user. */
loansRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const summary = await getSummary(userId);
    sendOk(res, summary);
  }),
);

/** POST /api/loans - creates a loan owned by the signed-in user. */
loansRouter.post(
  '/',
  validateBody(createLoanSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const body = req.body as CreateLoanBody;
    const loan = await createLoan(userId, {
      friendName: body.friendName,
      amount: body.amount,
      dueDate: body.dueDate,
    });
    sendOk(res, { loan }, 201);
  }),
);

/** PATCH /api/loans/:id/repay - marks an owned pending loan as repaid. */
loansRouter.patch(
  '/:id/repay',
  validateParams(loanIdParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const loan = await repayLoan(userId, req.params.id as string);
    sendOk(res, { loan, message: 'Loan marked as repaid.' });
  }),
);

/** POST /api/loans/:id/receipt - attaches a receipt photo to an owned loan. */
loansRouter.post(
  '/:id/receipt',
  validateParams(loanIdParamsSchema),
  uploadReceipt,
  attachReceiptPath,
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const receiptPath = req.body?.receiptPath as string | undefined;
    if (!receiptPath) {
      throw badRequest('Attach an image file in the "receipt" field.', 'RECEIPT_REQUIRED');
    }
    const loan = await attachReceipt(userId, req.params.id as string, receiptPath);
    sendOk(res, { loan, message: 'Receipt attached.' });
  }),
);

/** GET /api/loans/:id/receipt - streams the receipt of an owned loan. */
loansRouter.get(
  '/:id/receipt',
  validateParams(loanIdParamsSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const loan = await findLoanByIdForUser(userId, req.params.id as string);
    if (!loan) {
      throw notFound('Loan not found.', 'LOAN_NOT_FOUND');
    }
    if (!loan.receipt_path) {
      throw notFound('This loan has no receipt attached.', 'RECEIPT_NOT_FOUND');
    }
    const absolutePath = resolveReceiptPath(loan.receipt_path);
    if (!existsSync(absolutePath)) {
      throw notFound('The receipt file is no longer available.', 'RECEIPT_FILE_MISSING');
    }
    res.sendFile(absolutePath);
  }),
);
