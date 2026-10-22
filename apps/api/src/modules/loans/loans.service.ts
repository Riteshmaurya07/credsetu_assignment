import { getEnv } from '../../config/env.js';
import { conflict, notFound } from '../../errors/AppError.js';
import { now } from '../../utils/clock.js';
import { daysBetween, isOverdue, todayDateString } from '../../utils/dates.js';
import { formatDecimalString } from '../../utils/money.js';
import {
  createLoan as createLoanRecord,
  findLoanByIdForUser,
  getSummaryForUser,
  listLoansByUser,
  markLoanRepaid,
  setLoanReceiptPath,
  type LoanRow,
} from './loans.repository.js';

export interface LoanView {
  id: string;
  friendName: string;
  /** Exact decimal string, e.g. `"1500.00"`. */
  amount: string;
  /** Calendar date `YYYY-MM-DD`. */
  dueDate: string;
  status: 'pending' | 'repaid';
  isOverdue: boolean;
  daysOverdue: number;
  receiptPath: string | null;
  repaidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSummary {
  totalLent: string;
  totalRepaid: string;
  overdueAmount: string;
  pendingAmount: string;
  loanCount: number;
  pendingCount: number;
  repaidCount: number;
  overdueCount: number;
}

export interface CreateLoanInput {
  friendName: string;
  amount: string;
  dueDate: string;
}

/** The calendar date used for every overdue calculation of this request. */
export function resolveToday(): string {
  return todayDateString(now(), getEnv().appTimeZone);
}

function toLoanView(row: LoanRow, today: string): LoanView {
  const overdue = isOverdue(row.due_date, today, row.status);
  return {
    id: row.id,
    friendName: row.friend_name,
    amount: formatDecimalString(row.amount),
    dueDate: row.due_date,
    status: row.status,
    isOverdue: overdue,
    daysOverdue: overdue ? daysBetween(row.due_date, today) : 0,
    receiptPath: row.receipt_path,
    repaidAt: row.repaid_at ? row.repaid_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Lists the loans owned by the authenticated user. */
export async function listLoans(userId: string): Promise<LoanView[]> {
  const today = resolveToday();
  const rows = await listLoansByUser(userId, today);
  return rows.map((row) => toLoanView(row, today));
}

/** Creates a loan owned by the authenticated user. */
export async function createLoan(userId: string, input: CreateLoanInput): Promise<LoanView> {
  const today = resolveToday();
  const row = await createLoanRecord({
    userId,
    friendName: input.friendName,
    amount: input.amount,
    dueDate: input.dueDate,
  });
  return toLoanView(row, today);
}

/**
 * Marks a pending loan as repaid.
 *
 * @throws 404 when the loan does not exist or is not owned by the caller
 * @throws 409 when the loan has already been repaid
 */
export async function repayLoan(userId: string, loanId: string): Promise<LoanView> {
  const today = resolveToday();
  const row = await markLoanRepaid(userId, loanId);
  if (!row) {
    // Either the loan does not exist, belongs to somebody else, or is already
    // repaid. Distinguish the invalid transition without leaking ownership.
    const existing = await findLoanByIdForUser(userId, loanId);
    if (existing && existing.status === 'repaid') {
      throw conflict('This loan has already been marked as repaid.', 'LOAN_ALREADY_REPAID');
    }
    throw notFound('Loan not found.', 'LOAN_NOT_FOUND');
  }
  return toLoanView(row, today);
}

/** Attaches a receipt path to a loan owned by the authenticated user. */
export async function attachReceipt(
  userId: string,
  loanId: string,
  receiptPath: string,
): Promise<LoanView> {
  const today = resolveToday();
  const row = await setLoanReceiptPath(userId, loanId, receiptPath);
  if (!row) {
    throw notFound('Loan not found.', 'LOAN_NOT_FOUND');
  }
  return toLoanView(row, today);
}

/** Aggregated summary for the authenticated user. */
export async function getSummary(userId: string): Promise<LoanSummary> {
  const today = resolveToday();
  const row = await getSummaryForUser(userId, today);
  return {
    totalLent: formatDecimalString(row.total_lent),
    totalRepaid: formatDecimalString(row.total_repaid),
    overdueAmount: formatDecimalString(row.overdue_amount),
    pendingAmount: formatDecimalString(row.pending_amount),
    loanCount: row.loan_count,
    pendingCount: row.pending_count,
    repaidCount: row.repaid_count,
    overdueCount: row.overdue_count,
  };
}
