import { query as dbQuery } from '../../db/pool.js';

export type LoanStatus = 'pending' | 'repaid';

export interface LoanRow {
  id: string;
  user_id: string;
  friend_name: string;
  /** NUMERIC(14,2) - returned by PostgreSQL as an exact decimal string. */
  amount: string;
  /** DATE - returned as `YYYY-MM-DD`. */
  due_date: string;
  status: LoanStatus;
  receipt_path: string | null;
  repaid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SummaryRow {
  total_lent: string;
  total_repaid: string;
  overdue_amount: string;
  pending_amount: string;
  loan_count: number;
  pending_count: number;
  repaid_count: number;
  overdue_count: number;
}

/**
 * Lists every loan owned by a user.
 * The `user_id` filter is always applied, so a user can only ever read their
 * own records.
 */
export async function listLoansByUser(userId: string, today: string): Promise<LoanRow[]> {
  const { rows } = await dbQuery<LoanRow>(
    `SELECT id, user_id, friend_name, amount, due_date, status, receipt_path, repaid_at, created_at, updated_at
     FROM loans
     WHERE user_id = $1
     ORDER BY
       CASE WHEN status = 'pending' AND due_date < $2::date THEN 0 ELSE 1 END,
       CASE WHEN status = 'pending' AND due_date < $2::date THEN due_date END ASC,
       CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
       due_date ASC,
       created_at DESC`,
    [userId, today],
  );
  return rows;
}

/** Creates a loan for the given owner. */
export async function createLoan(input: {
  userId: string;
  friendName: string;
  amount: string;
  dueDate: string;
}): Promise<LoanRow> {
  const { rows } = await dbQuery<LoanRow>(
    `INSERT INTO loans (user_id, friend_name, amount, due_date, status)
     VALUES ($1, $2, $3::numeric(14,2), $4::date, 'pending')
     RETURNING id, user_id, friend_name, amount, due_date, status, receipt_path, repaid_at, created_at, updated_at`,
    [input.userId, input.friendName, input.amount, input.dueDate],
  );
  return rows[0] as LoanRow;
}

/** Fetches a single loan, scoped to its owner. */
export async function findLoanByIdForUser(userId: string, loanId: string): Promise<LoanRow | null> {
  const { rows } = await dbQuery<LoanRow>(
    `SELECT id, user_id, friend_name, amount, due_date, status, receipt_path, repaid_at, created_at, updated_at
     FROM loans
     WHERE id = $1 AND user_id = $2`,
    [loanId, userId],
  );
  return rows[0] ?? null;
}

/**
 * Marks a pending loan as repaid.
 * The update is scoped to the owner and to `status = 'pending'`, so an invalid
 * transition (repaid -> repaid) affects zero rows instead of corrupting data.
 */
export async function markLoanRepaid(userId: string, loanId: string): Promise<LoanRow | null> {
  const { rows } = await dbQuery<LoanRow>(
    `UPDATE loans
     SET status = 'repaid', repaid_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'pending'
     RETURNING id, user_id, friend_name, amount, due_date, status, receipt_path, repaid_at, created_at, updated_at`,
    [loanId, userId],
  );
  return rows[0] ?? null;
}

/** Attaches a receipt path to a loan owned by the user. */
export async function setLoanReceiptPath(
  userId: string,
  loanId: string,
  receiptPath: string,
): Promise<LoanRow | null> {
  const { rows } = await dbQuery<LoanRow>(
    `UPDATE loans
     SET receipt_path = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, friend_name, amount, due_date, status, receipt_path, repaid_at, created_at, updated_at`,
    [loanId, userId, receiptPath],
  );
  return rows[0] ?? null;
}

/**
 * Aggregates the summary for a user.
 *
 *  - totalLent    : sum of every loan (pending + repaid)
 *  - totalRepaid  : sum of the loans that are marked repaid
 *  - overdueAmount: sum of *pending* loans whose due date is strictly before
 *                   the supplied date (a loan due today is not overdue)
 *  - pendingAmount: sum of the loans that are still pending
 */
export async function getSummaryForUser(userId: string, today: string): Promise<SummaryRow> {
  const { rows } = await dbQuery<SummaryRow>(
    `SELECT
       COALESCE(SUM(amount), 0)::numeric(14,2) AS total_lent,
       COALESCE(SUM(amount) FILTER (WHERE status = 'repaid'), 0)::numeric(14,2) AS total_repaid,
       COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < $2::date), 0)::numeric(14,2) AS overdue_amount,
       COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::numeric(14,2) AS pending_amount,
       (COUNT(*))::int AS loan_count,
       (COUNT(*) FILTER (WHERE status = 'pending'))::int AS pending_count,
       (COUNT(*) FILTER (WHERE status = 'repaid'))::int AS repaid_count,
       (COUNT(*) FILTER (WHERE status = 'pending' AND due_date < $2::date))::int AS overdue_count
     FROM loans
     WHERE user_id = $1`,
    [userId, today],
  );
  return (
    rows[0] ?? {
      total_lent: '0.00',
      total_repaid: '0.00',
      overdue_amount: '0.00',
      pending_amount: '0.00',
      loan_count: 0,
      pending_count: 0,
      repaid_count: 0,
      overdue_count: 0,
    }
  );
}
