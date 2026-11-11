import type { Page, Route } from '@playwright/test';

// Stand-ins for the states the recording lacks in "recover from errors" (ADR 0009): an unhandled server
// error on a read, maintenance mode, and the "Ask for access" endpoint. What the app sends is kept.

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export const UNHANDLED_REFERENCE = 'JB-500-7F3K';

/** A time Jubilee is back: 11:00 UTC is 6:00 a.m. Eastern on Wednesday 11 November 2026. */
export const BACK_BY = '2026-11-11T11:00:00+00:00';

export interface FakeFailure {
  /** How many of the next answers still fail. */
  remaining: number;
  /** How many requests were made. */
  requests: number;
}

/** The first `times` requests to `url` fail with an unhandled server error (JB-500); then the recording answers. */
export async function stubUnhandled(page: Page, url: string, times = 1): Promise<FakeFailure> {
  return stubFailing(page, url, times, () =>
    problem(500, { code: 'unexpected_error', reference: UNHANDLED_REFERENCE }),
  );
}

/** The first `times` requests to `url` are held by maintenance mode (503 with the back-by time). */
export async function stubMaintenance(page: Page, url: string, times = 1): Promise<FakeFailure> {
  return stubFailing(page, url, times, () =>
    problem(503, { code: 'MAINTENANCE', backBy: BACK_BY }),
  );
}

async function stubFailing(
  page: Page,
  url: string,
  times: number,
  answer: () => ReturnType<typeof problem>,
): Promise<FakeFailure> {
  const fake: FakeFailure = { remaining: times, requests: 0 };
  await page.route(url, (route: Route) => {
    fake.requests++;
    if (fake.remaining > 0) {
      fake.remaining--;
      return route.fulfill(answer());
    }
    return route.fallback();
  });
  return fake;
}

export interface FakeHelp {
  /** `offline` answers with a 503; `ok` records the request. */
  mode: 'ok' | 'offline';
  /** How many of the next requests fail with a 503. */
  failures: number;
  bodies: Record<string, unknown>[];
  keys: (string | undefined)[];
}

export async function stubHelp(
  page: Page,
  initial: Partial<Pick<FakeHelp, 'mode' | 'failures'>> = {},
): Promise<FakeHelp> {
  const fake: FakeHelp = { mode: 'ok', failures: 0, ...initial, bodies: [], keys: [] };
  await page.route('**/api/help/access-requests', (route) => {
    fake.bodies.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    fake.keys.push(route.request().headers()['idempotency-key']);
    if (fake.failures > 0 || fake.mode === 'offline') {
      fake.failures = Math.max(0, fake.failures - 1);
      return route.fulfill(problem(503, { reference: 'JB-HELP-503' }));
    }
    return route.fulfill({ status: 201, json: { id: 'access-1' } });
  });
  return fake;
}
