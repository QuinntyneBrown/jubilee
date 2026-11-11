import type { Page, Route } from '@playwright/test';

// A stand-in for the forgotten-password endpoints (L2-008, L2-009). What the app sends is kept so a test can
// prove it, token included: it must travel in a body and never in a URL (ADR 0009, L2-140 AC2).

export const RESET_EMAIL = 'joanna.adeyemi@example.com';
export const BREACHED = 'password12345';

export interface FakePasswordReset {
  /** How the link request is answered: accepted, or the server fails. */
  request: 'accepts' | 'fails' | 'slow';
  /** The state the link is in when the page opens: valid, expired, or the lookup fails. */
  link: 'valid' | 'expired' | 'fails';
  /** How the change is answered: accepted, or the link has expired meanwhile, or the server fails. */
  reset: 'accepts' | 'expires' | 'fails';
  requestedFor: string[];
  inspected: string[];
  changes: { token: string; newPassword: string; repeatPassword: string }[];
  /** Every URL the app called, to prove no token is in one. */
  urls: string[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubPasswordReset(
  page: Page,
  initial: Partial<Pick<FakePasswordReset, 'request' | 'link' | 'reset'>> = {},
): Promise<FakePasswordReset> {
  const fake: FakePasswordReset = {
    request: 'accepts',
    link: 'valid',
    reset: 'accepts',
    requestedFor: [],
    inspected: [],
    changes: [],
    urls: [],
    ...initial,
  };

  await page.route(/\/api\/account\/password-reset/, async (route: Route) => {
    const request = route.request();
    fake.urls.push(request.url());
    const body = request.postDataJSON() as Record<string, string>;
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/password-reset-requests')) {
      fake.requestedFor.push(body.email);
      if (fake.request === 'fails') return route.fulfill(problem(503, { reference: 'JB-AUTH-503' }));
      if (fake.request === 'slow') await new Promise((resolve) => setTimeout(resolve, 600));
      return route.fulfill({ status: 202 });
    }

    if (path.endsWith('/password-resets/inspect')) {
      fake.inspected.push(body.token);
      if (fake.link === 'fails') return route.fulfill(problem(503, { reference: 'JB-AUTH-504' }));
      return route.fulfill({
        json: fake.link === 'valid' ? { state: 'valid', email: RESET_EMAIL } : { state: 'expired', email: null },
      });
    }

    fake.changes.push({ token: body.token, newPassword: body.newPassword, repeatPassword: body.repeatPassword });
    if (fake.reset === 'expires') return route.fulfill(problem(410, { code: 'LINK_EXPIRED' }));
    if (fake.reset === 'fails') return route.fulfill(problem(503, { reference: 'JB-AUTH-505' }));
    if (body.newPassword === BREACHED) {
      return route.fulfill(problem(422, { code: 'validation_failed', errors: { newPassword: 'PASSWORD_BREACHED' } }));
    }
    return route.fulfill({ status: 204 });
  });

  return fake;
}
