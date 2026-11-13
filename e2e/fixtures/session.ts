import type { Page, Route } from '@playwright/test';
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

/**
 * Answers every call that matches with 401 `SESSION_EXPIRED`, as the API does once a session has
 * ended (L2-116). `laterBy` holds back every answer after the first, for calls that are refused
 * one after another.
 */
export async function refuseAsExpired(
  page: Page,
  url: string | RegExp,
  laterBy = 0,
): Promise<{ count: number; answered: number }> {
  const seen = { count: 0, answered: 0 };
  await page.route(url, async (route) => {
    if (seen.count++ > 0 && laterBy > 0) {
      await new Promise((resolve) => setTimeout(resolve, laterBy));
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Sign in to continue.', status: 401, code: 'SESSION_EXPIRED' }),
    });
    seen.answered++;
  });
  return seen;
}

/** The name the app keeps a member's drafts under: its hash of the e-mail address (ADR 0046). */
function draftOwner(email: string): string {
  const text = email.trim().toLowerCase();
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Leaves a draft on the device as the app does when a session ends (L2-116): the form `key` at
 * `address` shows `values` again, once, to the member with this e-mail address.
 */
export async function keepDraft(
  page: Page,
  draft: { email: string; address: string; key: string; values: Record<string, string | boolean> },
): Promise<void> {
  const kept = [
    {
      owner: draftOwner(draft.email),
      address: draft.address,
      key: draft.key,
      values: draft.values,
      savedAt: Date.now(),
    },
  ];
  await page.addInitScript((drafts) => {
    // Once per browser: a reload must not bring back a draft the app has already given back.
    if (sessionStorage.getItem('jb-draft-kept')) return;
    sessionStorage.setItem('jb-draft-kept', '1');
    localStorage.setItem('jubilee-drafts', JSON.stringify(drafts));
  }, kept);
}

/**
 * Jubilee while it starts, as for a few minutes after a deployment (L2-003 AC9): every `/api`
 * request is answered 503 "Jubilee is starting." until `ready()`, and from the recording after.
 */
export async function stubStarting(page: Page): Promise<{ ready(): Promise<void> }> {
  const starting = (route: Route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/problem+json',
      headers: { 'Retry-After': '5' },
      body: JSON.stringify({ status: 503, title: 'Jubilee is starting.', code: 'UNAVAILABLE' }),
    });
  await page.route('**/api/**', starting);
  return { ready: () => page.unroute('**/api/**', starting) };
}
