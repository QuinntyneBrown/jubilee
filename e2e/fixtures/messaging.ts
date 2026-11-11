import type { Page, Route } from '@playwright/test';

// A stand-in for the messaging endpoints (L2-055 to L2-063). The seeded API has no conversations,
// so the answers the mocks show are produced here; the requests the app makes are kept so a test
// can prove what it sent (ADR 0009).

export interface FakeRow {
  id: string;
  title: string;
  businessName: string;
  businessSlug: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  muted: boolean;
}

export interface FakeMessage {
  id: string;
  body: string;
  sentAt: string;
  mine: boolean;
  senderFirstName: string;
  attachment: null;
}

const row = (
  id: string,
  name: string,
  slug: string,
  preview: string,
  lastMessageAt: string,
  unread: boolean,
): FakeRow => ({
  id,
  title: name,
  businessName: name,
  businessSlug: slug,
  preview,
  lastMessageAt,
  unread,
  muted: false,
});

/** The four conversations of the mock inbox (docs/mocks/pages/messages/default.html). */
export const inboxRows = (): FakeRow[] => [
  row(
    'c-legacy',
    'Legacy Financial',
    'legacy-financial',
    'Trevor: Thursday at 10:00 works. See you then!',
    '2026-11-10T14:14:00Z',
    true,
  ),
  row(
    'c-waterworks',
    'WaterWorks Plumbing & Drains',
    'waterworks-plumbing-drains',
    'We can come Saturday morning for the kitchen drain.',
    '2026-11-09T15:00:00Z',
    true,
  ),
  row(
    'c-bookstores',
    'Christian Bookstores',
    'christian-bookstores',
    'You: Perfect, I’ll pick it up Friday.',
    '2026-11-07T15:00:00Z',
    false,
  ),
  row(
    'c-flowers',
    'Flower Creations',
    'flower-creations',
    'Thanks for the lovely review of the arrangement!',
    '2026-10-28T15:00:00Z',
    false,
  ),
];

export const legacyMessages = (): FakeMessage[] => [
  message('m-1', 'Hi Joanna, thanks for reaching out. Happy to talk through RRSPs and a plan for giving.', '2026-11-10T13:52:00Z', false),
  message('m-2', 'Thank you! Is Thursday morning possible? Video is easiest for me.', '2026-11-10T14:03:00Z', true),
  message('m-3', 'Thursday at 10:00 works. See you then!', '2026-11-10T14:14:00Z', false),
];

function message(id: string, body: string, sentAt: string, mine: boolean): FakeMessage {
  return { id, body, sentAt, mine, senderFirstName: mine ? 'Joanna' : 'Trevor', attachment: null };
}

export type Delivery = 'ok' | 'fail' | 'hang' | 'rate-limited' | 'unconfirmed';

/** What the fake answers, and what it was asked; a test changes these while it runs. */
export interface FakeMessaging {
  inbox: 'ok' | 'empty' | 'loading' | 'error';
  conversation: 'ok' | 'loading' | 'error' | 'not-found';
  /** How the next sends and starts are answered. */
  delivery: Delivery;
  awayUntil: string | null;
  hasMore: boolean;
  rows: FakeRow[];
  messages: FakeMessage[];
  earlier: FakeMessage[];
  searches: (string | null)[];
  opened: { before: string | null }[];
  sends: { body: string; idempotencyKey: string }[];
  starts: { listingSlug: string; body: string; idempotencyKey: string }[];
}

const problem = (status: number, code: string, reference?: string) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, code, reference, correlationId: 'e2e' }),
});

function hang(route: Route): Promise<void> {
  return new Promise(() => void route);
}

/** Installs the messaging answers on `page` and returns the fake, to steer and to inspect. */
export async function stubMessaging(
  page: Page,
  initial: Partial<FakeMessaging> = {},
): Promise<FakeMessaging> {
  const fake: FakeMessaging = {
    inbox: 'ok',
    conversation: 'ok',
    delivery: 'ok',
    awayUntil: null,
    hasMore: false,
    rows: inboxRows(),
    messages: legacyMessages(),
    earlier: [],
    searches: [],
    opened: [],
    sends: [],
    starts: [],
    ...initial,
  };

  const fail = (route: Route) => {
    switch (fake.delivery) {
      case 'hang':
        return hang(route);
      case 'fail':
        return route.abort('failed');
      case 'rate-limited':
        return route.fulfill({ ...problem(429, 'rate_limited'), headers: { 'Retry-After': '60' } });
      case 'unconfirmed':
        return route.fulfill(problem(403, 'EMAIL_UNCONFIRMED'));
      default:
        return null;
    }
  };

  // The inbox and starting a conversation.
  await page.route(/\/api\/conversations(\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as FakeMessaging['starts'][number];
      const failure = fail(route);
      if (failure) return failure;
      fake.starts.push(body);
      return route.fulfill({
        status: 201,
        json: { conversationId: 'c-legacy', messageId: 'm-started' },
      });
    }
    const q = new URL(request.url()).searchParams.get('q');
    fake.searches.push(q);
    if (fake.inbox === 'loading') return hang(route);
    if (fake.inbox === 'error') return route.fulfill(problem(503, 'service_unavailable', 'JB-MSG-503'));
    const rows =
      fake.inbox === 'empty'
        ? []
        : fake.rows.filter(
            (r) => !q || `${r.title} ${r.preview}`.toLowerCase().includes(q.toLowerCase()),
          );
    return route.fulfill({
      json: { totalCount: rows.length, unreadCount: rows.filter((r) => r.unread).length, conversations: rows },
    });
  });

  // One conversation, and sending to it.
  await page.route(/\/api\/conversations\/c-legacy(\?.*)?$/, (route) => {
    const before = new URL(route.request().url()).searchParams.get('before');
    fake.opened.push({ before });
    if (fake.conversation === 'loading') return hang(route);
    if (fake.conversation === 'error') {
      return route.fulfill(problem(503, 'service_unavailable', 'JB-MSG-502'));
    }
    if (fake.conversation === 'not-found') return route.fulfill(problem(404, 'conversation_not_found'));
    const messages = before ? fake.earlier : fake.messages;
    return route.fulfill({
      json: {
        id: 'c-legacy',
        business: { name: 'Legacy Financial', slug: 'legacy-financial' },
        counterpart: { name: 'Trevor Chew' },
        muted: false,
        canBlock: true,
        awayUntil: fake.awayUntil,
        replies: 'day',
        hasMore: before ? false : fake.hasMore,
        messages,
      },
    });
  });

  await page.route('**/api/conversations/c-legacy/messages', (route) => {
    const body = route.request().postDataJSON() as FakeMessaging['sends'][number];
    const failure = fail(route);
    if (failure) return failure;
    fake.sends.push(body);
    const sent = message(`m-sent-${fake.sends.length}`, body.body, '2026-11-10T14:00:00Z', true);
    fake.messages.push(sent);
    return route.fulfill({ status: 201, json: sent });
  });

  return fake;
}
