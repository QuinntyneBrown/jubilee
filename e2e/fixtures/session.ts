import type { Page } from '@playwright/test';
import { joanna } from './cast';

/** Joanna as `GET /api/session` reports her once she has signed in with her e-mail (L2-006). */
export const joannaSession = {
  ...joanna.session,
  email: 'joanna.adeyemi@example.com',
  emailStatus: 'confirmed',
};

/** Another member of the same device, for what one member must never see of another (L2-011 AC3). */
export const naomiSession = {
  signedIn: true,
  firstName: 'Naomi',
  displayName: 'Naomi Laurent',
  initials: 'NL',
  email: 'naomi.laurent@example.com',
  emailStatus: 'confirmed',
};

export const PASSWORD = 'correct horse 13';

/**
 * The session endpoints of a browser in which someone signs in and out (ADR 0009): a visitor
 * until `POST /api/session`, then `member`; a visitor again after `DELETE /api/session`.
 * `expire()` makes the next answers of `/api/session` a visitor's, as after the server ended it.
 */
export interface FakeSession {
  /** The bodies `POST /api/session` saw. */
  signIns: Record<string, unknown>[];
  signOuts: number;
  /** How often the other sessions were ended. */
  othersEnded: number;
  /** Who signs in next. */
  member: Record<string, unknown>;
  expire(): void;
}

export async function stubSession(
  page: Page,
  options: {
    signedIn?: boolean;
    member?: Record<string, unknown>;
    otherSessionCount?: number;
    endOthers?: 'ends' | 'fails' | 'pending';
  } = {},
): Promise<FakeSession> {
  let signedIn = options.signedIn ?? false;
  let others = options.otherSessionCount ?? 0;
  const fake: FakeSession = {
    signIns: [],
    signOuts: 0,
    othersEnded: 0,
    member: options.member ?? joannaSession,
    expire: () => {
      signedIn = false;
    },
  };
  const current = (): Record<string, unknown> =>
    signedIn
      ? { ...fake.member, otherSessionCount: others }
      : { signedIn: false, googleSignIn: true };
  await page.route('**/api/session', (route) => {
    const method = route.request().method();
    if (method === 'POST') {
      fake.signIns.push(route.request().postDataJSON() as Record<string, unknown>);
      signedIn = true;
      return route.fulfill({ json: current() });
    }
    if (method === 'DELETE') {
      fake.signOuts++;
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: current() });
  });
  await page.route('**/api/session/others', async (route) => {
    if (options.endOthers === 'pending') return; // never answered: the dialog stays busy
    if (options.endOthers === 'fails') {
      return route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({ title: 'Something went wrong.', status: 500 }),
      });
    }
    fake.othersEnded++;
    others = 0;
    return route.fulfill({ status: 204 });
  });
  await page.route('**/api/me/navigation', (route) => route.fulfill({ json: joanna.navigation }));
  return fake;
}

/** Answers every call that matches with 401 `SESSION_EXPIRED`, as the API does once a session has ended (L2-116). */
export async function refuseAsExpired(page: Page, url: string | RegExp): Promise<{ count: number }> {
  const seen = { count: 0 };
  await page.route(url, (route) => {
    seen.count++;
    return route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Sign in to continue.', status: 401, code: 'SESSION_EXPIRED' }),
    });
  });
  return seen;
}
