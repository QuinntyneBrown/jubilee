import type { Page } from '@playwright/test';
import { naomi } from './incoming-requests';

// A stand-in for the agreement to an updated statement of faith (L2-075 AC3 to AC6, ADR 0018).
// The session names the agreement due; what the app sends is kept so a test can prove it (ADR 0009).

/** The agreement Naomi owes: the statement was updated on 2 November 2026 and she has until 2 December. */
export const STATEMENT_DUE = {
  version: '2026-11-02',
  updatedOn: '2026-11-02',
  agreeBy: '2026-12-02',
  overdue: false,
  business: 'Luzandre.com',
};

/** The same after the 30 days: the daily job has paused her listing (L2-075 AC6). */
export const STATEMENT_LAPSED = { ...STATEMENT_DUE, overdue: true };

/** Naomi's session while she owes the agreement. */
export const naomiOwing = (due: typeof STATEMENT_DUE = STATEMENT_DUE) => ({
  ...naomi,
  statementDue: due,
});

export interface FakeStatement {
  /** How "I agree" is answered: `pending` never answers, so the dialog stays busy. */
  outcome: 'ok' | 'fails' | 'pending';
  /** The bodies `POST /api/statement-of-faith/agreement` saw. */
  agreements: Record<string, unknown>[];
}

/** Answers "I agree"; `onAgreed` runs when the agreement is recorded. */
export async function stubStatementAgreement(
  page: Page,
  outcome: FakeStatement['outcome'] = 'ok',
  onAgreed: () => void = () => undefined,
): Promise<FakeStatement> {
  const fake: FakeStatement = { outcome, agreements: [] };
  await page.route('**/api/statement-of-faith/agreement', async (route) => {
    fake.agreements.push(route.request().postDataJSON() as Record<string, unknown>);
    if (fake.outcome === 'pending') return;
    if (fake.outcome === 'fails') {
      return route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Something went wrong', status: 500 }),
      });
    }
    onAgreed();
    return route.fulfill({ status: 204 });
  });
  return fake;
}
