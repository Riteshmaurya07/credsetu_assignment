import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, bearer, login } from '../helpers/api.js';
import { resetClock, setClock } from '../../src/utils/clock.js';

const app = buildTestApp();

/** A frozen clock makes every overdue calculation deterministic. */
const TODAY = '2026-06-15';
const FIXED_NOW = new Date('2026-06-15T09:00:00.000Z');

const ALICE_PHONE = '9876543210';
const BOB_PHONE = '9123456789';

let alice: Awaited<ReturnType<typeof login>>;
let bob: Awaited<ReturnType<typeof login>>;

beforeEach(async () => {
  setClock(() => FIXED_NOW);
  alice = await login(app, ALICE_PHONE);
  bob = await login(app, BOB_PHONE);
});

afterEach(() => {
  resetClock();
});

async function createLoan(
  session: Awaited<ReturnType<typeof login>>,
  body: Record<string, unknown>,
) {
  return request(app).post('/api/loans').set(bearer(session)).send(body);
}

describe('POST /api/loans', () => {
  it('creates a loan owned by the signed-in user', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: 1500.5,
      dueDate: '2026-07-01',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.loan).toMatchObject({
      friendName: 'Amit',
      amount: '1500.50',
      dueDate: '2026-07-01',
      status: 'pending',
      isOverdue: false,
      receiptPath: null,
    });
    expect(response.body.data.loan.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps the amount exact for values with two decimals', async () => {
    const response = await createLoan(alice, {
      friendName: 'Priya',
      amount: '1234.56',
      dueDate: '2026-07-01',
    });
    expect(response.body.data.loan.amount).toBe('1234.56');
  });

  it('rejects a zero amount', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: 0,
      dueDate: '2026-07-01',
    });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a negative amount', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: -100,
      dueDate: '2026-07-01',
    });
    expect(response.status).toBe(422);
  });

  it('rejects an amount with more than two decimals', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: '10.005',
      dueDate: '2026-07-01',
    });
    expect(response.status).toBe(422);
  });

  it('rejects a non numeric amount', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: 'abc',
      dueDate: '2026-07-01',
    });
    expect(response.status).toBe(422);
  });

  it('rejects a missing amount', async () => {
    const response = await createLoan(alice, { friendName: 'Amit', dueDate: '2026-07-01' });
    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('amount');
  });

  it('rejects a missing friend name', async () => {
    const response = await createLoan(alice, { amount: 100, dueDate: '2026-07-01' });
    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('friendName');
  });

  it('rejects a blank friend name', async () => {
    const response = await createLoan(alice, {
      friendName: '   ',
      amount: 100,
      dueDate: '2026-07-01',
    });
    expect(response.status).toBe(422);
  });

  it('rejects a missing due date', async () => {
    const response = await createLoan(alice, { friendName: 'Amit', amount: 100 });
    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('dueDate');
  });

  it('rejects an invalid due date', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: 100,
      dueDate: '01-07-2026',
    });
    expect(response.status).toBe(422);
  });

  it('rejects an impossible due date', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: 100,
      dueDate: '2026-02-30',
    });
    expect(response.status).toBe(422);
  });

  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/loans')
      .send({ friendName: 'Amit', amount: 100, dueDate: '2026-07-01' });
    expect(response.status).toBe(401);
  });

  it('ignores a user id supplied by the client', async () => {
    const response = await createLoan(alice, {
      friendName: 'Amit',
      amount: 100,
      dueDate: '2026-07-01',
      userId: bob.userId,
    });
    expect(response.status).toBe(201);

    // The loan must belong to Alice, not to the id the client sent.
    const bobLoans = await request(app).get('/api/loans').set(bearer(bob));
    expect(bobLoans.body.data.count).toBe(0);

    const aliceLoans = await request(app).get('/api/loans').set(bearer(alice));
    expect(aliceLoans.body.data.count).toBe(1);
  });
});

describe('GET /api/loans', () => {
  it('returns an empty list for a user without loans', async () => {
    const response = await request(app).get('/api/loans').set(bearer(alice));
    expect(response.status).toBe(200);
    expect(response.body.data.loans).toEqual([]);
    expect(response.body.data.count).toBe(0);
  });

  it('returns only the loans of the signed-in user', async () => {
    await createLoan(alice, { friendName: 'Amit', amount: 500, dueDate: '2026-07-01' });
    await createLoan(bob, { friendName: 'Priya', amount: 900, dueDate: '2026-07-01' });

    const aliceLoans = await request(app).get('/api/loans').set(bearer(alice));
    expect(aliceLoans.body.data.count).toBe(1);
    expect(aliceLoans.body.data.loans[0].friendName).toBe('Amit');

    const bobLoans = await request(app).get('/api/loans').set(bearer(bob));
    expect(bobLoans.body.data.count).toBe(1);
    expect(bobLoans.body.data.loans[0].friendName).toBe('Priya');
  });

  it('marks a past due pending loan as overdue and a loan due today as not overdue', async () => {
    await createLoan(alice, { friendName: 'Overdue', amount: 100, dueDate: '2026-06-14' });
    await createLoan(alice, { friendName: 'Today', amount: 200, dueDate: TODAY });
    await createLoan(alice, { friendName: 'Future', amount: 300, dueDate: '2026-06-16' });

    const response = await request(app).get('/api/loans').set(bearer(alice));
    const loans = response.body.data.loans as Array<Record<string, unknown>>;
    const byName = Object.fromEntries(loans.map((loan) => [loan.friendName, loan]));

    expect(byName.Overdue?.isOverdue).toBe(true);
    expect(byName.Overdue?.daysOverdue).toBe(1);
    expect(byName.Today?.isOverdue).toBe(false);
    expect(byName.Today?.daysOverdue).toBe(0);
    expect(byName.Future?.isOverdue).toBe(false);
  });

  it('sorts overdue loans first without hiding the others', async () => {
    await createLoan(alice, { friendName: 'Future', amount: 300, dueDate: '2026-06-16' });
    await createLoan(alice, { friendName: 'Overdue', amount: 100, dueDate: '2026-06-01' });
    await createLoan(alice, { friendName: 'Today', amount: 200, dueDate: TODAY });

    const response = await request(app).get('/api/loans').set(bearer(alice));
    const loans = response.body.data.loans as Array<Record<string, unknown>>;

    expect(loans).toHaveLength(3);
    expect(loans[0]?.friendName).toBe('Overdue');
    expect(loans.map((loan) => loan.friendName)).toContain('Future');
    expect(loans.map((loan) => loan.friendName)).toContain('Today');
  });
});

describe('PATCH /api/loans/:id/repay', () => {
  it('marks an owned pending loan as repaid', async () => {
    const created = await createLoan(alice, {
      friendName: 'Amit',
      amount: 1500,
      dueDate: '2026-07-01',
    });
    const loanId = created.body.data.loan.id as string;

    const response = await request(app)
      .patch(`/api/loans/${loanId}/repay`)
      .set(bearer(alice));

    expect(response.status).toBe(200);
    expect(response.body.data.loan.status).toBe('repaid');
    expect(response.body.data.loan.repaidAt).toBeTruthy();
  });

  it('rejects repaying an already repaid loan', async () => {
    const created = await createLoan(alice, {
      friendName: 'Amit',
      amount: 1500,
      dueDate: '2026-07-01',
    });
    const loanId = created.body.data.loan.id as string;

    const first = await request(app).patch(`/api/loans/${loanId}/repay`).set(bearer(alice));
    expect(first.status).toBe(200);

    const second = await request(app).patch(`/api/loans/${loanId}/repay`).set(bearer(alice));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('LOAN_ALREADY_REPAID');
  });

  it('returns 404 for a loan that does not exist', async () => {
    const response = await request(app)
      .patch('/api/loans/11111111-1111-4111-8111-111111111111/repay')
      .set(bearer(alice));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('LOAN_NOT_FOUND');
  });

  it('returns 404 for a loan that belongs to another user', async () => {
    const created = await createLoan(alice, {
      friendName: 'Amit',
      amount: 1500,
      dueDate: '2026-07-01',
    });
    const loanId = created.body.data.loan.id as string;

    const response = await request(app).patch(`/api/loans/${loanId}/repay`).set(bearer(bob));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('LOAN_NOT_FOUND');

    // Alice's loan is untouched.
    const list = await request(app).get('/api/loans').set(bearer(alice));
    expect(list.body.data.loans[0].status).toBe('pending');
  });

  it('rejects an invalid loan id', async () => {
    const response = await request(app).patch('/api/loans/not-a-uuid/repay').set(bearer(alice));
    expect(response.status).toBe(422);
  });

  it('requires authentication', async () => {
    const created = await createLoan(alice, {
      friendName: 'Amit',
      amount: 1500,
      dueDate: '2026-07-01',
    });
    const loanId = created.body.data.loan.id as string;
    const response = await request(app).patch(`/api/loans/${loanId}/repay`);
    expect(response.status).toBe(401);
  });
});

describe('GET /api/loans/summary', () => {
  it('returns numeric zeros for an empty dataset', async () => {
    const response = await request(app).get('/api/loans/summary').set(bearer(alice));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      totalLent: '0.00',
      totalRepaid: '0.00',
      overdueAmount: '0.00',
      pendingAmount: '0.00',
      loanCount: 0,
      pendingCount: 0,
      repaidCount: 0,
      overdueCount: 0,
    });
  });

  it('aggregates the totals of the signed-in user only', async () => {
    await createLoan(alice, { friendName: 'Amit', amount: 1000, dueDate: '2026-07-01' });
    await createLoan(bob, { friendName: 'Priya', amount: 5000, dueDate: '2026-07-01' });

    const response = await request(app).get('/api/loans/summary').set(bearer(alice));
    expect(response.body.data.totalLent).toBe('1000.00');
    expect(response.body.data.loanCount).toBe(1);
  });

  it('counts a pending past due loan as overdue', async () => {
    await createLoan(alice, { friendName: 'Overdue', amount: 500.25, dueDate: '2026-06-01' });

    const response = await request(app).get('/api/loans/summary').set(bearer(alice));
    expect(response.body.data.overdueAmount).toBe('500.25');
    expect(response.body.data.overdueCount).toBe(1);
    expect(response.body.data.pendingAmount).toBe('500.25');
    expect(response.body.data.totalLent).toBe('500.25');
  });

  it('does not count a loan due today as overdue', async () => {
    await createLoan(alice, { friendName: 'Today', amount: 750, dueDate: TODAY });

    const response = await request(app).get('/api/loans/summary').set(bearer(alice));
    expect(response.body.data.overdueAmount).toBe('0.00');
    expect(response.body.data.overdueCount).toBe(0);
    expect(response.body.data.pendingAmount).toBe('750.00');
    expect(response.body.data.totalLent).toBe('750.00');
  });

  it('never counts a repaid loan - even with a past due date - as overdue', async () => {
    const created = await createLoan(alice, {
      friendName: 'Overdue',
      amount: 400,
      dueDate: '2026-01-01',
    });
    await request(app)
      .patch(`/api/loans/${created.body.data.loan.id}/repay`)
      .set(bearer(alice));

    const response = await request(app).get('/api/loans/summary').set(bearer(alice));
    expect(response.body.data.overdueAmount).toBe('0.00');
    expect(response.body.data.overdueCount).toBe(0);
    expect(response.body.data.totalLent).toBe('400.00');
    expect(response.body.data.totalRepaid).toBe('400.00');
    expect(response.body.data.pendingAmount).toBe('0.00');
    expect(response.body.data.repaidCount).toBe(1);
  });

  it('aggregates a mixed portfolio exactly', async () => {
    await createLoan(alice, { friendName: 'A', amount: 1000.1, dueDate: '2026-07-01' });
    await createLoan(alice, { friendName: 'B', amount: 250.25, dueDate: '2026-06-01' });
    const repaid = await createLoan(alice, {
      friendName: 'C',
      amount: 99.99,
      dueDate: '2026-05-01',
    });
    await request(app)
      .patch(`/api/loans/${repaid.body.data.loan.id}/repay`)
      .set(bearer(alice));

    const response = await request(app).get('/api/loans/summary').set(bearer(alice));
    expect(response.body.data.totalLent).toBe('1350.34');
    expect(response.body.data.totalRepaid).toBe('99.99');
    expect(response.body.data.overdueAmount).toBe('250.25');
    expect(response.body.data.pendingAmount).toBe('1250.35');
    expect(response.body.data.loanCount).toBe(3);
    expect(response.body.data.pendingCount).toBe(2);
    expect(response.body.data.repaidCount).toBe(1);
    expect(response.body.data.overdueCount).toBe(1);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/loans/summary');
    expect(response.status).toBe(401);
  });
});

describe('GET /api/health', () => {
  it('reports the service and database status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.database).toBe('up');
  });
});

describe('unknown routes', () => {
  it('returns a consistent 404 payload', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
