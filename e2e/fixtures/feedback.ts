import type { Page, Route } from '@playwright/test';

// A stand-in for the feedback endpoints (L2-214). What the app sends, and the Idempotency-Key
// header it sends it with, is kept so a test can prove it (ADR 0009).

/** One item of "Your feedback", as `GET /api/feedback` answers it. */
export interface FeedbackItem {
  id: string;
  kind: 'rating' | 'bug-report' | 'kudos';
  createdAt: string;
  status: 'received' | 'read' | 'in-progress' | 'fixed';
  rating: number | null;
  summary: string | null;
  reference: string | null;
  business: string | null;
  reply: string | null;
}

function item(partial: Partial<FeedbackItem> & Pick<FeedbackItem, 'id' | 'kind'>): FeedbackItem {
  return {
    createdAt: '2026-11-10T14:00:00Z',
    status: 'received',
    rating: null,
    summary: null,
    reference: null,
    business: null,
    reply: null,
    ...partial,
  };
}

/** Joanna's past feedback, as `docs/mocks/pages/feedback/default.html` lists it. */
export const HISTORY: FeedbackItem[] = [
  item({
    id: 'fb-4',
    kind: 'bug-report',
    createdAt: '2026-11-06T15:00:00Z',
    status: 'in-progress',
    summary: 'Photos I attach to a message take a long time to show',
    reference: 'FB-4NWP6R',
  }),
  item({
    id: 'fb-3',
    kind: 'kudos',
    createdAt: '2026-11-03T15:00:00Z',
    status: 'received',
    business: 'Christian Bookstores',
  }),
  item({
    id: 'fb-2',
    kind: 'rating',
    createdAt: '2026-10-28T15:00:00Z',
    status: 'read',
    rating: 4,
  }),
  item({
    id: 'fb-1',
    kind: 'bug-report',
    createdAt: '2026-10-21T15:00:00Z',
    status: 'fixed',
    summary: 'Search showed no results for “plumber” until I reloaded the page',
    reference: 'FB-3HX8TD',
    reply: 'Fixed on 23 October. Thanks for catching it, Joanna. Miriam, Jubilee',
  }),
];

/** The businesses Joanna has contacted, which kudos may name. */
export const BUSINESSES = [
  { slug: 'christian-bookstores', name: 'Christian Bookstores' },
  { slug: 'legacy-financial', name: 'Legacy Financial' },
  { slug: 'waterworks', name: 'WaterWorks Plumbing & Drains' },
];

export interface SentFeedback {
  /** `ratings`, `bug-reports`, `kudos`, `screenshots` or `check-ins/{id}`. */
  path: string;
  method: string;
  body: Record<string, unknown>;
  key: string | undefined;
}

export interface FakeFeedback {
  /** `invalid` answers with field codes, `offline` with a 503, `limited` with a 429, `pending` never. */
  mode: 'ok' | 'invalid' | 'offline' | 'limited' | 'pending';
  /** How many of the next sends fail with a 503 before the endpoint answers. */
  failures: number;
  /** What `GET /api/feedback` answers: the list, `loading` (never) or `error` (a 503). */
  history: FeedbackItem[] | 'loading' | 'error';
  businesses: { slug: string; name: string }[];
  /** The field codes of an `invalid` answer. */
  errors: Record<string, string>;
  /** Everything the app sent, in order. */
  sent: SentFeedback[];
}

const REFERENCE = 'FB-7K2M9Q';

export async function stubFeedback(
  page: Page,
  initial: Partial<Omit<FakeFeedback, 'sent'>> = {},
): Promise<FakeFeedback> {
  const fake: FakeFeedback = {
    mode: 'ok',
    failures: 0,
    history: HISTORY,
    businesses: BUSINESSES,
    errors: {},
    ...initial,
    sent: [],
  };
  const problem = (route: Route, status: number, body: object) =>
    route.fulfill({
      status,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
    });

  await page.route('**/api/feedback', (route) => {
    if (fake.history === 'loading') return new Promise<void>(() => undefined);
    if (fake.history === 'error') return problem(route, 503, { reference: 'JB-FBK-503' });
    return route.fulfill({ json: fake.history });
  });
  await page.route('**/api/feedback/businesses', (route) =>
    route.fulfill({ json: fake.businesses }),
  );
  await page.route('**/api/feedback/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/feedback/', '');
    if (request.method() === 'GET') return route.fallback();
    const upload = path === 'screenshots';
    fake.sent.push({
      path,
      method: request.method(),
      body: upload ? {} : ((request.postDataJSON() ?? {}) as Record<string, unknown>),
      key: request.headers()['idempotency-key'],
    });
    if (fake.failures > 0) {
      fake.failures--;
      return problem(route, 503, { reference: 'JB-FBK-503' });
    }
    switch (fake.mode) {
      case 'pending':
        return new Promise<void>(() => undefined);
      case 'invalid':
        return problem(route, 422, { errors: fake.errors });
      case 'offline':
        return problem(route, 503, { reference: 'JB-FBK-503' });
      case 'limited':
        return problem(route, 429, { code: 'RATE_LIMITED' });
    }
    if (upload) {
      const count = fake.sent.filter((sent) => sent.path === 'screenshots').length;
      return route.fulfill({ status: 201, json: { id: `shot-${count}` } });
    }
    if (path.startsWith('check-ins/')) return route.fulfill({ status: 204 });
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    const kind = path === 'ratings' ? 'rating' : path === 'kudos' ? 'kudos' : 'bug-report';
    const created = item({
      id: `new-${fake.sent.length}`,
      kind,
      createdAt: '2026-11-10T14:00:00Z',
      rating: kind === 'rating' ? Number(body['rating']) : null,
      summary: kind === 'bug-report' ? String(body['happened']).split('\n')[0] : null,
      reference: kind === 'bug-report' ? REFERENCE : null,
      business:
        kind === 'kudos' && body['business']
          ? (fake.businesses.find((b) => b.slug === body['business'])?.name ?? null)
          : null,
    });
    if (Array.isArray(fake.history)) fake.history = [created, ...fake.history];
    return route.fulfill({ status: 201, json: created });
  });
  return fake;
}
