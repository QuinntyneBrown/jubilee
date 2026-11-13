import type { Page, Route } from '@playwright/test';

// A stand-in for the data export and account deletion endpoints (L2-017, L2-018). The requests the app makes are
// kept so a test can prove what it sent (ADR 0009).

export interface FakeAccountData {
  /** Where the member's latest export stands when the page opens. */
  exportState: 'none' | 'requested' | 'ready' | 'expired' | 'failed';
  request: 'ok' | 'fails';
  /** `unavailable` answers the link with 404, as for an expired or foreign token. */
  download: 'ok' | 'unavailable';
  summary: 'ok' | 'fails';
  /** `fails` answers the deletion with a 500; `mismatch` with the server's 422; `offline` drops the connection. */
  deletion: 'ok' | 'fails' | 'mismatch' | 'offline';
  conversations: number;
  openRequests: number;
  exportRequests: number;
  downloads: string[];
  deletions: string[];
  deleted: boolean;
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubAccountData(
  page: Page,
  initial: Partial<FakeAccountData> = {},
): Promise<FakeAccountData> {
  const fake: FakeAccountData = {
    exportState: 'none',
    request: 'ok',
    download: 'ok',
    summary: 'ok',
    deletion: 'ok',
    conversations: 4,
    openRequests: 3,
    exportRequests: 0,
    downloads: [],
    deletions: [],
    deleted: false,
    ...initial,
  };
  const status = () => ({
    status: fake.exportState,
    requestedAt: fake.exportState === 'none' ? null : '2026-11-10T09:00:00-05:00',
    readyAt: null,
    expiresAt: null,
  });

  // The more specific route is registered last: Playwright tries the latest first.
  await page.route('**/api/account/data-exports/*', (route: Route) => {
    const token = new URL(route.request().url()).pathname.split('/').pop() as string;
    fake.downloads.push(token);
    if (fake.download === 'unavailable') {
      return route.fulfill(problem(404, { code: 'DATA_LINK_UNAVAILABLE' }));
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-disposition': 'attachment; filename="jubilee-data.json"' },
      body: JSON.stringify({ profile: { firstName: 'Joanna' } }),
    });
  });
  await page.route('**/api/account/data-exports/current', (route) =>
    route.fulfill({ json: status() }),
  );
  await page.route('**/api/account/data-exports', (route) => {
    fake.exportRequests++;
    if (fake.request === 'fails') return route.fulfill(problem(503, { reference: 'JB-ACC-521' }));
    fake.exportState = 'requested';
    return route.fulfill({ status: 202, json: status() });
  });
  await page.route('**/api/account/deletion-summary', (route) =>
    fake.summary === 'fails'
      ? route.fulfill(problem(503, { reference: 'JB-ACC-524' }))
      : route.fulfill({
          json: {
            name: 'Joanna Adeyemi',
            email: 'joanna.adeyemi@example.com',
            conversations: fake.conversations,
            openRequests: fake.openRequests,
          },
        }),
  );
  await page.route('**/api/account', (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const { confirmation } = route.request().postDataJSON() as { confirmation: string };
    fake.deletions.push(confirmation);
    if (fake.deletion === 'offline') return route.abort('internetdisconnected');
    if (fake.deletion === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.deletion === 'mismatch') {
      return route.fulfill(
        problem(422, {
          code: 'validation_failed',
          errors: { confirmation: 'CONFIRMATION_MISMATCH' },
        }),
      );
    }
    fake.deleted = true;
    return route.fulfill({ status: 204 });
  });
  // Once the account is deleted the session is over.
  await page.route('**/api/session', (route) =>
    fake.deleted ? route.fulfill({ json: { signedIn: false } }) : route.fallback(),
  );

  return fake;
}
