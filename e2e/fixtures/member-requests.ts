import type { Page, Route } from '@playwright/test';

// A stand-in for the member's requests endpoints (L2-047 to L2-049) and for the session of the
// member. The requests the app makes are kept so a test can prove what it sent (ADR 0009).

export type Status = 'new' | 'confirmed' | 'declined' | 'cancelled' | 'completed';

export interface FakeMemberRequest {
  id: string;
  kind: 'booking' | 'quote' | 'order' | 'space';
  kindLabel: string;
  title: string;
  business: string;
  businessSlug: string;
  detail: string | null;
  sentAt: string;
  /** When a confirmed booking starts; the meeting step carries it (L2-047). */
  startsAt?: string;
  status: Status;
  previous: Status;
  details: { label: string; value: string }[];
  owner: string;
  categorySlug: string;
  categoryWord: string;
  declineMessage?: string;
  shortNotice?: boolean;
  unanswered?: boolean;
  conversationId?: string | null;
  /** What the server says at the top, when the test needs its own words (a space's address). */
  callout?: { tone: string; title: string; text: string; quote: string | null };
}

export interface FakeMemberRequests {
  /** `fails` answers a read with a 503. */
  list: 'ok' | 'fails';
  detail: 'ok' | 'fails' | 'missing';
  cancel: 'ok' | 'fails' | 'conflict';
  undo: 'ok' | 'fails';
  requests: FakeMemberRequest[];
  listRequests: string[];
  cancels: string[];
  undos: string[];
  /** Changes a request's status, as if the owner had answered it. */
  answer: (id: string, status: Status) => void;
}

export const joanna = {
  signedIn: true,
  firstName: 'Joanna',
  displayName: 'Joanna Adeyemi',
  initials: 'JA',
  isModerator: false,
};

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export const MEETING = '7a1e0000-0000-4000-8000-000000000001';
export const DRAIN = '7a1e0000-0000-4000-8000-000000000002';
export const BIBLE = '7a1e0000-0000-4000-8000-000000000003';
export const FLOWERS = '7a1e0000-0000-4000-8000-000000000004';

export function seedRequests(): FakeMemberRequest[] {
  return [
    {
      id: BIBLE,
      kind: 'order',
      kindLabel: 'Order',
      title: 'Leather journaling Bible, ESV × 1',
      business: 'Christian Bookstores',
      businessSlug: 'christian-bookstores',
      detail: 'Pickup Fri 13 Nov · $64.00 + tax',
      sentAt: '2026-11-08T10:00:00-05:00',
      status: 'confirmed',
      previous: 'new',
      details: [
        { label: 'Item', value: 'Leather journaling Bible, ESV × 1' },
        { label: 'Delivery', value: 'Pickup Fri 13 Nov' },
        { label: 'Total', value: '$64.00 + tax' },
      ],
      owner: 'Ben',
      categorySlug: 'shops',
      categoryWord: 'shops',
    },
    {
      id: MEETING,
      kind: 'booking',
      kindLabel: 'Booking',
      title: 'Discovery meeting',
      business: 'Legacy Financial',
      businessSlug: 'legacy-financial',
      detail: 'Thu 12 Nov, 10:00 a.m. · Video',
      sentAt: '2026-11-09T20:40:00-05:00',
      startsAt: '2026-11-12T10:00:00-05:00',
      status: 'confirmed',
      previous: 'new',
      details: [
        { label: 'Service', value: 'Discovery meeting' },
        { label: 'When', value: 'Thu 12 Nov, 10:00–10:30 a.m.' },
        { label: 'How', value: 'Video call' },
        { label: 'Your note', value: 'I’d like to talk about RRSPs and a giving plan.' },
      ],
      owner: 'Trevor',
      categorySlug: 'financial-insurance',
      categoryWord: 'financial & insurance',
    },
    {
      id: DRAIN,
      kind: 'quote',
      kindLabel: 'Quote',
      title: 'Kitchen drain is slow and gurgling',
      business: 'WaterWorks Plumbing & Drains',
      businessSlug: 'waterworks',
      detail: null,
      sentAt: '2026-11-09T16:20:00-05:00',
      status: 'new',
      previous: 'new',
      details: [
        { label: 'What you need', value: 'Kitchen drain is slow and gurgling. Tried a plunger.' },
        { label: 'When', value: 'Needed by Fri 13 Nov' },
        { label: 'Contact', value: 'Message on Jubilee, or 416-555-0142' },
      ],
      owner: 'Wanda',
      categorySlug: 'home-property',
      categoryWord: 'home & property',
    },
    {
      id: FLOWERS,
      kind: 'order',
      kindLabel: 'Order',
      title: 'Autumn table arrangement × 1',
      business: 'Flower Creations',
      businessSlug: 'flower-creations',
      detail: 'Delivered Wed 28 Oct · $85.00 + tax',
      sentAt: '2026-10-27T10:00:00-04:00',
      status: 'completed',
      previous: 'confirmed',
      details: [{ label: 'Item', value: 'Autumn table arrangement × 1' }],
      owner: 'Fiona',
      categorySlug: 'shops',
      categoryWord: 'shops',
    },
  ];
}

const LABEL: Record<Status, string> = {
  new: 'Awaiting reply',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

const isOpen = (r: FakeMemberRequest) => r.status === 'new' || r.status === 'confirmed';

function callout(r: FakeMemberRequest) {
  if (r.callout) return r.callout;
  switch (r.status) {
    case 'new':
      return r.unanswered
        ? {
            tone: 'warning',
            title: `${r.business} has not replied yet`,
            text: 'It has been over a week. You can cancel this request or ask again.',
            quote: null,
          }
        : {
            tone: 'info',
            title: `Waiting for ${r.business} to reply`,
            text: 'They usually answer within a day. We’ll notify you the moment they do.',
            quote: null,
          };
    case 'confirmed':
      return r.kind === 'booking'
        ? {
            tone: 'success',
            title: `${r.owner} confirmed your meeting`,
            text: 'Thu 12 Nov, 10:00–10:30 a.m. by video. The link is in your messages and we’ll remind you an hour before.',
            quote: null,
          }
        : {
            tone: 'success',
            title: `${r.owner} confirmed your order`,
            text: `${r.owner} will message you about payment and pickup.`,
            quote: null,
          };
    case 'declined':
      return {
        tone: 'warning',
        title: `${r.business} can’t take this job`,
        text: '',
        quote: r.declineMessage ?? null,
      };
    case 'cancelled':
      return {
        tone: 'info',
        title: 'You cancelled this request',
        text: `${r.business} has been told. Nothing more will happen with it.`,
        quote: null,
      };
    default:
      return { tone: 'success', title: 'Completed', text: 'This is done.', quote: null };
  }
}

function timeline(r: FakeMemberRequest) {
  const steps: { title: string; meta: string | null; at: string | null; state: string }[] = [
    { title: 'You asked', meta: null, at: r.sentAt, state: 'complete' },
  ];
  if (r.status === 'new') {
    steps.push({
      title: `${r.business} replies`,
      meta: 'Usually within a day',
      at: null,
      state: 'current',
    });
    steps.push({ title: 'Meeting', meta: null, at: null, state: 'upcoming' });
  } else if (r.status === 'confirmed') {
    steps.push({ title: `${r.business} confirmed`, meta: null, at: r.sentAt, state: 'complete' });
    // As the API does, the meeting step of a confirmed booking carries when it starts.
    steps.push({ title: 'Meeting', meta: null, at: r.startsAt ?? null, state: 'current' });
    steps.push({ title: 'Completed', meta: null, at: null, state: 'upcoming' });
  } else if (r.status === 'declined') {
    steps.push({ title: `${r.business} declined`, meta: null, at: r.sentAt, state: 'stopped' });
  } else if (r.status === 'cancelled') {
    steps.push({ title: 'You cancelled', meta: null, at: r.sentAt, state: 'stopped' });
  } else {
    steps.push({ title: 'Completed', meta: null, at: r.sentAt, state: 'complete' });
  }
  return steps;
}

export async function stubMemberRequests(
  page: Page,
  initial: Partial<FakeMemberRequests> = {},
  member = joanna,
): Promise<FakeMemberRequests> {
  const fake: FakeMemberRequests = {
    list: 'ok',
    detail: 'ok',
    cancel: 'ok',
    undo: 'ok',
    requests: seedRequests(),
    listRequests: [],
    cancels: [],
    undos: [],
    answer: (id, status) => {
      const request = fake.requests.find((r) => r.id === id);
      if (request) {
        request.previous = request.status;
        request.status = status;
      }
    },
    ...initial,
  };

  await page.route('**/api/session', (r) => r.fulfill({ json: member }));
  await page.route('**/api/me/navigation', (r) =>
    r.fulfill({
      json: {
        unreadConversationCount: 0,
        unreadNotificationCount: 0,
        newRequestCount: 0,
        ownsListing: false,
        isModerator: false,
      },
    }),
  );

  const decision = (r: FakeMemberRequest) => ({
    id: r.id,
    status: r.status,
    statusLabel: LABEL[r.status],
    business: r.business,
    undoUntil: r.status === 'cancelled' ? '2026-11-10T10:00:08-05:00' : null,
  });

  await page.route('**/api/requests/**', (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split('/').filter(Boolean).slice(2); // after api/requests
    const [id, action, sub] = parts;
    const found = fake.requests.find((r) => r.id === id);
    if (!action) {
      if (fake.detail === 'fails') return route.fulfill(problem(503, { reference: 'JB-REQ-502' }));
      if (fake.detail === 'missing' || !found) return route.fulfill(problem(404, {}));
      return route.fulfill({
        json: {
          id: found.id,
          kind: found.kind,
          kindLabel: found.kindLabel,
          title: found.title,
          business: found.business,
          businessSlug: found.businessSlug,
          categorySlug: found.categorySlug,
          categoryWord: found.categoryWord,
          ownerFirstName: found.owner,
          status: found.status,
          statusLabel: LABEL[found.status],
          callout: callout(found),
          details: found.details,
          timeline: timeline(found),
          canCancel: isOpen(found),
          cancelLabel:
            found.kind === 'booking' && found.status === 'confirmed'
              ? 'Cancel booking'
              : 'Cancel request',
          shortNotice: found.shortNotice ?? false,
          canAskAgain: ['cancelled', 'declined'].includes(found.status) || !!found.unanswered,
          canAddToCalendar: found.kind === 'booking' && found.status === 'confirmed',
          conversationId: found.conversationId ?? null,
          unanswered: !!found.unanswered,
        },
      });
    }
    if (!found) return route.fulfill(problem(404, {}));
    if (action === 'cancel' && sub === 'undo') {
      fake.undos.push(id);
      if (fake.undo === 'fails') return route.fulfill(problem(409, { code: 'INVALID_TRANSITION' }));
      found.status = found.previous;
      return route.fulfill({ json: decision(found) });
    }
    if (fake.cancel === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.cancel === 'conflict') {
      found.status = 'declined';
      return route.fulfill(problem(409, { code: 'INVALID_TRANSITION' }));
    }
    fake.cancels.push(id);
    found.previous = found.status;
    found.status = 'cancelled';
    return route.fulfill({ json: decision(found) });
  });

  await page.route('**/api/requests?**', (route: Route) => {
    const url = new URL(route.request().url());
    fake.listRequests.push(url.search);
    if (fake.list === 'fails') return route.fulfill(problem(503, { reference: 'JB-REQ-501' }));
    const tab = url.searchParams.get('tab') ?? 'all';
    const cursor = Number(url.searchParams.get('cursor') ?? 0);
    const open = (r: FakeMemberRequest) => (isOpen(r) ? 0 : 1);
    const ordered = [...fake.requests].sort((a, b) => open(a) - open(b));
    const inTab = (r: FakeMemberRequest) =>
      tab === 'bookings'
        ? r.kind === 'booking'
        : tab === 'quotes'
          ? r.kind === 'quote'
          : tab === 'orders'
            ? r.kind === 'order'
            : tab === 'declined'
              ? r.status === 'declined'
              : true;
    const all = ordered.filter(inTab);
    const rows = all.slice(cursor, cursor + 20);
    return route.fulfill({
      json: {
        tab,
        counts: {
          all: fake.requests.length,
          bookings: fake.requests.filter((r) => r.kind === 'booking').length,
          quotes: fake.requests.filter((r) => r.kind === 'quote').length,
          orders: fake.requests.filter((r) => r.kind === 'order').length,
          declined: fake.requests.filter((r) => r.status === 'declined').length,
        },
        open: fake.requests.filter(isOpen).length,
        awaiting: fake.requests.filter((r) => r.status === 'new').length,
        rows: rows.map((r) => ({
          id: r.id,
          kind: r.kind,
          kindLabel: r.kindLabel,
          title: r.title,
          business: r.business,
          businessSlug: r.businessSlug,
          detail: r.detail,
          sentAt: r.sentAt,
          status: r.status,
          statusLabel: LABEL[r.status],
        })),
        nextCursor: cursor + 20 < all.length ? String(cursor + 20) : null,
      },
    });
  });

  return fake;
}
