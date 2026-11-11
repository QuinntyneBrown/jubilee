import type { Page, Route } from '@playwright/test';
import { MOCK_PHOTO } from './photos';

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
  attachment: { id: string; url: string; contentType: string } | null;
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
  message(
    'm-1',
    'Hi Joanna, thanks for reaching out. Happy to talk through RRSPs and a plan for giving.',
    '2026-11-10T13:52:00Z',
    false,
  ),
  message(
    'm-2',
    'Thank you! Is Thursday morning possible? Video is easiest for me.',
    '2026-11-10T14:03:00Z',
    true,
  ),
  message('m-3', 'Thursday at 10:00 works. See you then!', '2026-11-10T14:14:00Z', false),
];

function message(id: string, body: string, sentAt: string, mine: boolean): FakeMessage {
  return { id, body, sentAt, mine, senderFirstName: mine ? 'Joanna' : 'Trevor', attachment: null };
}

export interface FakeCard {
  id: string;
  kind: 'booking' | 'quote' | 'order';
  kindLabel: string;
  title: string;
  detail: string | null;
  status: 'new' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
  statusLabel: string;
  sentAt: string;
  link: string;
}

const card = (
  id: string,
  kind: FakeCard['kind'],
  title: string,
  detail: string | null,
  status: FakeCard['status'],
  statusLabel: string,
  sentAt: string,
): FakeCard => ({
  id,
  kind,
  kindLabel: `${kind[0].toUpperCase()}${kind.slice(1)} request`,
  title,
  detail,
  status,
  statusLabel,
  sentAt,
  link: `/requests/${id}`,
});

/** The confirmed booking of docs/mocks/pages/conversation/default.html, sent between the two messages. */
export const bookingCard = (): FakeCard =>
  card(
    'r-booking',
    'booking',
    'Discovery meeting',
    'Thu 12 Nov, 10:00–10:30 a.m. · Video',
    'confirmed',
    'Confirmed',
    '2026-11-10T14:10:00Z',
  );

/** The four cards of docs/mocks/pages/conversation/requests.html. */
export const requestCards = (): FakeCard[] => [
  {
    ...bookingCard(),
    status: 'new',
    statusLabel: 'Awaiting reply',
    sentAt: '2026-11-10T14:05:00Z',
  },
  card(
    'r-quote',
    'quote',
    'A plan for giving and RRSPs',
    'Needed by Fri 27 Nov',
    'confirmed',
    'Confirmed',
    '2026-11-10T14:06:00Z',
  ),
  card(
    'r-order',
    'order',
    'Retirement planning workbook × 1',
    'Pickup · $24.00 + tax',
    'declined',
    'Declined',
    '2026-11-10T14:07:00Z',
  ),
  card(
    'r-follow-up',
    'booking',
    'Follow-up meeting',
    'Tue 3 Nov, 2:00–2:30 p.m. · In person',
    'cancelled',
    'Cancelled',
    '2026-11-10T14:08:00Z',
  ),
];

/** The first signed link of a stored photo; the stand-in treats it as expired when told to. */
const signed = (id: string, sig = 'first') => `/api/attachments/${id}?expires=1&sig=${sig}`;

/** The two photo messages of docs/mocks/pages/conversation/photo.html. */
export const photoMessages = (): FakeMessage[] => [
  {
    ...message(
      'm-4',
      'Here’s the page of the statement I mentioned.',
      '2026-11-10T14:20:00Z',
      true,
    ),
    attachment: { id: 'a-statement', url: signed('a-statement'), contentType: 'image/jpeg' },
  },
  {
    ...message('m-5', '', '2026-11-10T14:26:00Z', false),
    attachment: { id: 'a-reply', url: signed('a-reply'), contentType: 'image/jpeg' },
  },
];

export type Delivery = 'ok' | 'fail' | 'hang' | 'rate-limited' | 'unconfirmed';

/** What the fake answers, and what it was asked; a test changes these while it runs. */
export interface FakeMessaging {
  inbox: 'ok' | 'empty' | 'loading' | 'error';
  conversation: 'ok' | 'loading' | 'error' | 'not-found';
  /** How the next sends and starts are answered. */
  delivery: Delivery;
  awayUntil: string | null;
  muted: boolean;
  /** How saving a mute is answered. */
  muting: 'ok' | 'fail';
  mutes: boolean[];
  /** False for an owner, who cannot block (L2-063 AC5). */
  canBlock: boolean;
  /** How a report is answered. */
  reporting: 'ok' | 'fail';
  reports: { reason: string; block: boolean }[];
  /** How an upload is answered: stored, cut off, never answered, or refused as not a photo. */
  uploading: 'ok' | 'fail' | 'hang' | 'refused';
  uploads: { bytes: number; contentType: string }[];
  /** `expired` answers a photo's first link with 404, as after five minutes. */
  links: 'ok' | 'expired';
  /** How a new link is answered. */
  renewing: 'ok' | 'fail';
  renewals: string[];
  /**
   * True answers the member's event stream (L2-070) from this stand-in, so `arrive` and `notify`
   * reach the open page. Off by default: a page that holds the stream open is never idle.
   */
  live: boolean;
  /** The other side writes: the message is stored and its notification goes down the stream. */
  arrive(body: string, conversation?: string): void;
  /** Sends a notification event down the stream. */
  notify(kind: 'message' | 'request', title: string, detail: string, target: string): void;
  hasMore: boolean;
  rows: FakeRow[];
  messages: FakeMessage[];
  /** The requests between the member and the business, as cards (L2-057 AC4). */
  requests: FakeCard[];
  earlier: FakeMessage[];
  searches: (string | null)[];
  opened: { before: string | null }[];
  sends: { body: string; idempotencyKey: string; attachmentId?: string }[];
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
  const events: { id: string; item: object }[] = [];
  const fake: FakeMessaging = {
    inbox: 'ok',
    conversation: 'ok',
    delivery: 'ok',
    awayUntil: null,
    muted: false,
    muting: 'ok',
    mutes: [],
    canBlock: true,
    reporting: 'ok',
    reports: [],
    uploading: 'ok',
    uploads: [],
    links: 'ok',
    renewing: 'ok',
    renewals: [],
    live: false,
    arrive(body, conversation = 'c-legacy') {
      const row = fake.rows.find((r) => r.id === conversation)!;
      const at = new Date(
        Date.parse('2026-11-10T14:15:00Z') + events.length * 60_000,
      ).toISOString();
      if (conversation === 'c-legacy') {
        fake.messages.push(message(`m-arrived-${events.length}`, body, at, false));
      }
      row.preview = `${conversation === 'c-legacy' ? 'Trevor: ' : ''}${body}`;
      row.lastMessageAt = at;
      row.unread = true;
      fake.rows = [row, ...fake.rows.filter((r) => r !== row)];
      fake.notify(
        'message',
        `New message from ${row.businessName}`,
        body,
        `/messages/${conversation}`,
      );
    },
    notify(kind, title, detail, target) {
      const id = String(1_000 + events.length + 1);
      events.push({
        id,
        item: {
          id: `n-${id}`,
          kind,
          title,
          detail,
          target,
          at: '2026-11-10T14:15:00Z',
          read: false,
        },
      });
    },
    hasMore: false,
    rows: inboxRows(),
    messages: legacyMessages(),
    requests: [bookingCard()],
    earlier: [],
    searches: [],
    opened: [],
    sends: [],
    starts: [],
    ...initial,
  };

  if (fake.live) {
    // The stream asks again soon after every answer, as a browser does, and says what it last received.
    await page.route('**/api/events', (route) => {
      const last = route.request().headers()['last-event-id'];
      const frames = events
        .filter((event) => last === undefined || Number(event.id) > Number(last))
        .map(
          (event) =>
            `id: ${event.id}\nevent: notification\ndata: ${JSON.stringify(event.item)}\n\n`,
        )
        .join('');
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `: connected\nretry: 200\n\n${frames}`,
      });
    });
  }

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
    if (fake.inbox === 'error')
      return route.fulfill(problem(503, 'service_unavailable', 'JB-MSG-503'));
    const rows =
      fake.inbox === 'empty'
        ? []
        : fake.rows.filter(
            (r) => !q || `${r.title} ${r.preview}`.toLowerCase().includes(q.toLowerCase()),
          );
    return route.fulfill({
      json: {
        totalCount: rows.length,
        unreadCount: rows.filter((r) => r.unread).length,
        conversations: rows,
      },
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
    if (fake.conversation === 'not-found')
      return route.fulfill(problem(404, 'conversation_not_found'));
    const messages = before ? fake.earlier : fake.messages;
    return route.fulfill({
      json: {
        id: 'c-legacy',
        business: { name: 'Legacy Financial', slug: 'legacy-financial' },
        counterpart: { name: 'Trevor Chew' },
        muted: fake.muted,
        canBlock: fake.canBlock,
        awayUntil: fake.awayUntil,
        replies: 'day',
        hasMore: before ? false : fake.hasMore,
        messages,
        requests: before ? [] : fake.requests,
      },
    });
  });

  await page.route('**/api/conversations/c-legacy/messages', (route) => {
    const body = route.request().postDataJSON() as FakeMessaging['sends'][number];
    const failure = fail(route);
    if (failure) return failure;
    fake.sends.push(body);
    const sent = message(`m-sent-${fake.sends.length}`, body.body, '2026-11-10T14:00:00Z', true);
    if (body.attachmentId) {
      sent.attachment = {
        id: body.attachmentId,
        url: signed(body.attachmentId),
        contentType: 'image/jpeg',
      };
    }
    fake.messages.push(sent);
    return route.fulfill({ status: 201, json: sent });
  });

  // Photos: the upload, the stored photo behind its signed link, and a new link for a participant.
  await page.route(/\/api\/conversations\/c-legacy\/attachments(\/[^/?]+)?$/, (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      const id = new URL(request.url()).pathname.split('/').pop()!;
      fake.renewals.push(id);
      if (fake.renewing === 'fail') return route.fulfill(problem(404, 'attachment_not_found'));
      return route.fulfill({ json: { url: signed(id, 'renewed') } });
    }
    if (fake.uploading === 'hang') return hang(route);
    if (fake.uploading === 'fail') return route.abort('failed');
    if (fake.uploading === 'refused') return route.fulfill(problem(422, 'INVALID_IMAGE'));
    const body = request.postDataBuffer() ?? Buffer.alloc(0);
    const type = /Content-Type: ([^\r\n]+)/i.exec(body.subarray(0, 400).toString('latin1'));
    fake.uploads.push({ bytes: body.length, contentType: type?.[1] ?? '' });
    return route.fulfill({ status: 201, json: { id: `a-${fake.uploads.length}` } });
  });

  await page.route('**/api/attachments/**', (route) => {
    const first = new URL(route.request().url()).searchParams.get('sig') === 'first';
    if (fake.links === 'expired' && first)
      return route.fulfill(problem(404, 'attachment_not_found'));
    return route.fulfill({ path: MOCK_PHOTO, contentType: 'image/jpeg' });
  });

  await page.route('**/api/conversations/c-legacy/report', (route) => {
    if (fake.reporting === 'fail') return route.abort('failed');
    fake.reports.push(route.request().postDataJSON() as FakeMessaging['reports'][number]);
    return route.fulfill({ status: 204 });
  });

  await page.route('**/api/conversations/c-legacy/mute', (route) => {
    if (fake.muting === 'fail') return route.fulfill(problem(500, 'SERVER_ERROR'));
    const { muted } = route.request().postDataJSON() as { muted: boolean };
    fake.mutes.push(muted);
    fake.muted = muted;
    const row = fake.rows.find((r) => r.id === 'c-legacy');
    if (row) row.muted = muted;
    return route.fulfill({ status: 204 });
  });

  return fake;
}

/**
 * Resolves when the app's next read of the inbox has been answered. Start it before the step
 * that opens Messages and await it after, so that what follows comes after the read, not
 * during it.
 */
export function nextInboxRead(page: Page): Promise<unknown> {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && /\/api\/conversations(\?.*)?$/.test(response.url()),
  );
}
