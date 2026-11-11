import type { Page } from '@playwright/test';

// A stand-in for the report endpoint (L2-039). What the app sends, and the Idempotency-Key header
// it sends it with, is kept so a test can prove it (ADR 0009).

export interface FakeReports {
  /** `invalid` answers with the server's field codes, `offline` with a 503, `limited` with a 429. */
  mode: 'ok' | 'invalid' | 'offline' | 'limited';
  /** How many of the next reports fail with a 503 before the endpoint answers. */
  failures: number;
  /** Each report as the app sent it. */
  bodies: Record<string, unknown>[];
  /** The Idempotency-Key header of each report. */
  keys: (string | undefined)[];
}

export async function stubReports(
  page: Page,
  initial: Partial<Pick<FakeReports, 'mode' | 'failures'>> = {},
): Promise<FakeReports> {
  const fake: FakeReports = { mode: 'ok', failures: 0, ...initial, bodies: [], keys: [] };
  await page.route('**/api/listings/*/reports', (route) => {
    fake.bodies.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    fake.keys.push(route.request().headers()['idempotency-key']);
    const problem = (status: number, body: object) =>
      route.fulfill({
        status,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
      });
    if (fake.failures > 0) {
      fake.failures--;
      return problem(503, { reference: 'JB-REPORT-503' });
    }
    switch (fake.mode) {
      case 'invalid':
        return problem(422, {
          errors: { reason: 'REASON_REQUIRED', description: 'DESCRIPTION_REQUIRED' },
        });
      case 'offline':
        return problem(503, { reference: 'JB-REPORT-503' });
      case 'limited':
        return problem(429, { code: 'RATE_LIMITED' });
      default:
        return route.fulfill({ status: 201, json: { id: 'report-1' } });
    }
  });
  return fake;
}
