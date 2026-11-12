import type { Page, Route } from '@playwright/test';
import { naomi } from './incoming-requests';

// A stand-in for the notification centre (L2-064, L2-065) and for the member's event stream (L2-070).
// What the app sends is kept so a test can prove it (ADR 0009).

export interface FakeNotification {
  id: string;
  kind: 'request' | 'message' | 'listing' | 'account' | 'reminder' | 'business' | 'product';
  title: string;
  detail: string;
  target: string;
  at: string;
  read: boolean;
}

export interface FakeNotifications {
  /** `fails` answers the list with a 503. */
  list: 'ok' | 'fails';
  /** `fails` answers mark-all-read with a 500. */
  markAll: 'ok' | 'fails';
  items: FakeNotification[];
  opened: string[];
  allRead: number;
  /** Events the stream sends once the browser asks again; each one has the id the browser echoes. */
  push(item: FakeNotification, id?: string): void;
  /** What the stream was asked for, by `Last-Event-ID`. */
  lastEventIds: (string | undefined)[];
  /** Counts the stream sends, when they change. */
  counts: { unreadConversationCount: number; newRequestCount: number } | null;
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const at = (iso: string) => iso;

export const NOTIFICATIONS: FakeNotification[] = [
  {
    id: 'c3000000-0000-4000-8000-000000000001',
    kind: 'request',
    title: 'Legacy Financial confirmed your meeting',
    detail: 'Thu 12 Nov, 10:00 a.m. by video',
    target: '/requests/r1',
    at: at('2026-11-10T14:14:00Z'),
    read: false,
  },
  {
    id: 'c3000000-0000-4000-8000-000000000002',
    kind: 'message',
    title: 'New message from WaterWorks Plumbing & Drains',
    detail: '“We can come Saturday morning for the kitchen drain.”',
    target: '/messages/m1',
    at: at('2026-11-09T23:02:00Z'),
    read: false,
  },
  {
    id: 'c3000000-0000-4000-8000-000000000003',
    kind: 'request',
    title: 'Christian Bookstores confirmed your order',
    detail: 'Leather journaling Bible, ESV · pickup Fri 13 Nov',
    target: '/requests/r2',
    at: at('2026-11-07T15:00:00Z'),
    read: false,
  },
  {
    id: 'c3000000-0000-4000-8000-000000000004',
    kind: 'business',
    title: 'New in Shops: Flower Creations',
    detail: 'Fresh Blooms for Every Occasion',
    target: '/b/flower-creations',
    at: at('2026-11-02T15:00:00Z'),
    read: true,
  },
  {
    id: 'c3000000-0000-4000-8000-000000000005',
    kind: 'account',
    title: 'Your e-mail is confirmed',
    detail: 'You can now message businesses and book meetings.',
    target: '/account',
    at: at('2026-10-14T15:00:00Z'),
    read: true,
  },
];

/** A product Joanna asked about is back in stock (L2-036 AC4). */
export const BACK_IN_STOCK: FakeNotification = {
  id: 'c3000000-0000-4000-8000-000000000006',
  kind: 'product',
  title: 'Faith heavyweight tee, charcoal is back in stock',
  detail: 'Luzandre.com has it again. You asked to be told.',
  target: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
  at: at('2026-11-10T13:40:00Z'),
  read: false,
};

export async function stubNotifications(
  page: Page,
  initial: Partial<Pick<FakeNotifications, 'list' | 'markAll' | 'counts'>> & {
    items?: FakeNotification[];
  } = {},
  member = naomi,
): Promise<FakeNotifications> {
  const queue: { id: string; item: FakeNotification }[] = [];
  let ticks = 1_000;
  const fake: FakeNotifications = {
    list: 'ok',
    markAll: 'ok',
    items: structuredClone(NOTIFICATIONS),
    opened: [],
    allRead: 0,
    lastEventIds: [],
    counts: null,
    push(item, id) {
      ticks += 1;
      queue.push({ id: id ?? String(ticks), item });
      fake.items.unshift(item);
    },
    ...initial,
  };
  if (initial.items) fake.items = structuredClone(initial.items);

  const unread = () => fake.items.filter((item) => !item.read).length;

  await page.route('**/api/session', (r) => r.fulfill({ json: member }));
  await page.route('**/api/me/navigation', (r) =>
    r.fulfill({
      json: {
        unreadConversationCount: fake.counts?.unreadConversationCount ?? 2,
        unreadNotificationCount: unread(),
        newRequestCount: fake.counts?.newRequestCount ?? 0,
        ownsListing: false,
        isVerifier: false,
        verificationCount: 0,
      },
    }),
  );

  await page.route(/\/api\/notifications(\/.*)?$/, (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split('/').slice(3);
    if (request.method() === 'GET') {
      if (fake.list === 'fails') return route.fulfill(problem(503, { reference: 'JB-NTF-503' }));
      return route.fulfill({ json: { unread: unread(), items: fake.items } });
    }
    if (path[0] === 'read-all') {
      fake.allRead += 1;
      if (fake.markAll === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      fake.items.forEach((item) => (item.read = true));
      return route.fulfill({ json: { unread: 0 } });
    }
    const item = fake.items.find((entry) => entry.id === path[0])!;
    fake.opened.push(item.id);
    item.read = true;
    return route.fulfill({ json: { unread: unread() } });
  });

  // The stream asks again soon after every answer, as a browser does, and says what it last received.
  await page.route('**/api/events', (route: Route) => {
    const last = route.request().headers()['last-event-id'];
    fake.lastEventIds.push(last);
    const fresh = queue.filter((entry) => last === undefined || Number(entry.id) > Number(last));
    const frames = fresh
      .map(
        (entry) => `id: ${entry.id}\nevent: notification\ndata: ${JSON.stringify(entry.item)}\n\n`,
      )
      .join('');
    const counts = fake.counts
      ? `event: counts\ndata: ${JSON.stringify({
          unreadConversationCount: fake.counts.unreadConversationCount,
          unreadNotificationCount: unread(),
          newRequestCount: fake.counts.newRequestCount,
          ownsListing: false,
          isVerifier: false,
          verificationCount: 0,
        })}\n\n`
      : '';
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `: connected\nretry: 300\n\n${frames}${counts}`,
    });
  });

  return fake;
}
