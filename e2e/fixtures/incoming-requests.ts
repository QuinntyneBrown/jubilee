import type { Page, Route } from '@playwright/test';

// A stand-in for the owner's side of requests (L2-051 to L2-053) and for the session of an owner.
// The requests the app makes are kept so a test can prove what it sent (ADR 0009).

export type Outcome = 'ok' | 'fails';

export interface FakeRow {
  id: string;
  kind: 'order' | 'booking' | 'quote' | 'space';
  kindLabel: string;
  customerName: string;
  customerInitials: string;
  title: string;
  detail: string;
  sentAt: string;
  status: string;
  statusLabel: 'New' | 'Confirmed' | 'Declined';
  total: string | null;
  when: string | null;
}

export interface FakeIncoming {
  /** `fails` answers the list with a 503; `forbidden` with a 403; `empty` with no requests at all. */
  list: Outcome | 'forbidden' | 'empty';
  /** `cancelled` answers as if the customer had cancelled a moment earlier (409). */
  confirm: Outcome | 'cancelled';
  /** How long the confirm takes to answer, so a test can close the dialog first. */
  confirmDelayMs: number;
  undo: Outcome;
  /** `cancelled` answers as if the customer had cancelled a moment earlier (409). */
  decline: Outcome | 'cancelled';
  /**
   * The event stream (L2-070): `ok` answers with what arrived since the browser last asked and is asked
   * again at once, as a stream that stays up; `down` refuses every attempt to connect.
   */
  stream: 'ok' | 'down';
  repliesFast: boolean;
  rows: FakeRow[];
  listRequests: string[];
  confirms: string[];
  undos: string[];
  declines: { id: string; reason: string; message: string }[];
  /** Adds a new request, as if a member had just sent one: the owner's notification goes down the stream. */
  arrive: (row?: Partial<FakeRow>) => FakeRow;
  /** The customer cancels a request, as the stream tells the owner. */
  cancel: (id: string) => void;
}

export const naomi = {
  signedIn: true,
  firstName: 'Naomi',
  displayName: 'Naomi Laurent',
  initials: 'NL',
  isVerifier: false,
};

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const NOW = '2026-11-10T08:15:00-05:00';

export const SAMUEL = '5d0b1c2e-0000-4000-8000-000000000001';
export const RUTH = '5d0b1c2e-0000-4000-8000-000000000002';
export const DAVID = '5d0b1c2e-0000-4000-8000-000000000003';

export function seedRows(): FakeRow[] {
  return [
    {
      id: SAMUEL,
      kind: 'order',
      kindLabel: 'Order',
      customerName: 'Samuel Park',
      customerInitials: 'SP',
      title: 'Custom church team tee × 24',
      detail: 'For Agincourt Community Church youth retreat',
      sentAt: NOW,
      status: 'New',
      statusLabel: 'New',
      total: '$528.00 + tax',
      when: null,
    },
    {
      id: RUTH,
      kind: 'order',
      kindLabel: 'Order',
      customerName: 'Ruth Mensah',
      customerInitials: 'RM',
      title: 'Gold cross stoneware mug × 2',
      detail: 'Pickup in Leslieville',
      sentAt: '2026-11-09T10:00:00-05:00',
      status: 'New',
      statusLabel: 'New',
      total: '$48.00 + tax',
      when: null,
    },
    {
      id: DAVID,
      kind: 'quote',
      kindLabel: 'Quote',
      customerName: 'David Chen',
      customerInitials: 'DC',
      title: 'Church merch package',
      detail: '150 tees and 60 mugs for a 25th anniversary',
      sentAt: '2026-11-08T10:00:00-05:00',
      status: 'New',
      statusLabel: 'New',
      total: null,
      when: 'Fri 27 Nov',
    },
  ];
}

export async function stubIncoming(
  page: Page,
  initial: Partial<FakeIncoming> = {},
  member = naomi,
): Promise<FakeIncoming> {
  let arrivals = 0;
  let ticks = 1_000;
  const events: { id: string; item: object }[] = [];
  const tell = (title: string, detail: string) => {
    ticks += 1;
    events.push({
      id: String(ticks),
      item: {
        id: `c3000000-0000-4000-8000-0000000${ticks}`,
        kind: 'request',
        title,
        detail,
        target: '/my-business/requests',
        at: NOW,
        read: false,
      },
    });
  };
  const fake: FakeIncoming = {
    list: 'ok',
    confirm: 'ok',
    confirmDelayMs: 0,
    undo: 'ok',
    decline: 'ok',
    stream: 'ok',
    repliesFast: false,
    rows: seedRows(),
    listRequests: [],
    confirms: [],
    undos: [],
    declines: [],
    arrive: (extra = {}) => {
      arrivals += 1;
      const row: FakeRow = {
        id: `5d0b1c2e-0000-4000-8000-0000000001${String(arrivals).padStart(2, '0')}`,
        kind: 'booking',
        kindLabel: 'Booking',
        customerName: 'Grace Adeyemi',
        customerInitials: 'GA',
        title: 'Consultation',
        detail: 'Thu 12 Nov, 10:00 · Video call',
        sentAt: NOW,
        status: 'New',
        statusLabel: 'New',
        total: null,
        when: 'Thu 12 Nov, 10:00',
        ...extra,
      };
      fake.rows.unshift(row);
      tell(`New ${row.kindLabel.toLowerCase()} request from ${row.customerName}`, row.title);
      return row;
    },
    cancel: (id) => {
      const row = fake.rows.find((item) => item.id === id)!;
      fake.rows.splice(fake.rows.indexOf(row), 1);
      tell(`${row.customerName} cancelled their request`, row.title);
    },
    ...initial,
  };

  const count = (label?: string) =>
    fake.rows.filter((row) => !label || row.statusLabel === label).length;

  const navigation = () => ({
    unreadConversationCount: 2,
    unreadNotificationCount: 3,
    newRequestCount: count('New'),
    ownsListing: true,
    isVerifier: false,
    verificationCount: 0,
  });

  await page.route('**/api/session', (r) => r.fulfill({ json: member }));
  await page.route('**/api/me/navigation', (r) => r.fulfill({ json: navigation() }));

  // The stream is asked again soon after every answer, as a browser does, and says what it last received.
  await page.route('**/api/events', (route: Route) => {
    if (fake.stream === 'down') return route.abort('connectionrefused');
    const last = route.request().headers()['last-event-id'];
    const frames = events
      .filter((entry) => last === undefined || Number(entry.id) > Number(last))
      .map(
        (entry) => `id: ${entry.id}\nevent: notification\ndata: ${JSON.stringify(entry.item)}\n\n`,
      )
      .join('');
    return route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `: connected\nretry: 300\n\n${frames}event: counts\ndata: ${JSON.stringify(navigation())}\n\n`,
    });
  });

  const decision = (row: FakeRow, label: string) => ({
    id: row.id,
    status: label,
    statusLabel: label,
    kind: row.kind,
    customerFirstName: row.customerName.split(' ')[0],
    undoUntil: null,
  });

  await page.route('**/api/my-business/requests**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split('/').filter(Boolean).slice(3); // after api/my-business/requests
    if (parts.length === 0) {
      fake.listRequests.push(url.search);
      if (fake.list === 'fails') return route.fulfill(problem(503, { reference: 'JB-REQ-503' }));
      if (fake.list === 'forbidden') return route.fulfill(problem(403, { code: 'FORBIDDEN' }));
      const rows = fake.list === 'empty' ? [] : fake.rows;
      const tab = url.searchParams.get('tab') ?? 'new';
      const label = { new: 'New', confirmed: 'Confirmed', declined: 'Declined' }[tab];
      const all = fake.list === 'empty' ? 0 : count();
      return route.fulfill({
        json: {
          listing: { name: 'Luzandre.com', slug: 'luzandre-com', verified: true },
          tab,
          counts:
            fake.list === 'empty'
              ? { new: 0, confirmed: 0, declined: 0, all: 0 }
              : {
                  new: count('New'),
                  confirmed: count('Confirmed'),
                  declined: count('Declined'),
                  all,
                },
          repliesFast: fake.repliesFast,
          rows: rows.filter((row) => !label || row.statusLabel === label),
        },
      });
    }
    const [id, action, sub] = parts;
    const row = fake.rows.find((item) => item.id === id);
    if (!row) return route.fulfill(problem(404, { code: 'REQUEST_NOT_FOUND' }));
    if (action === 'confirm' && sub === 'undo') {
      fake.undos.push(id);
      if (fake.undo === 'fails') {
        return route.fulfill(problem(409, { code: 'INVALID_TRANSITION' }));
      }
      row.statusLabel = 'New';
      return route.fulfill({ json: decision(row, 'New') });
    }
    if (action === 'confirm') {
      if (fake.confirmDelayMs) await new Promise((done) => setTimeout(done, fake.confirmDelayMs));
      if (fake.confirm === 'cancelled') {
        row.statusLabel = 'Declined';
        return route.fulfill(
          problem(409, {
            code: 'INVALID_TRANSITION',
            detail: `${row.customerName} cancelled this request.`,
          }),
        );
      }
      if (fake.confirm === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      fake.confirms.push(id);
      row.statusLabel = 'Confirmed';
      return route.fulfill({ json: decision(row, 'Confirmed') });
    }
    const body = request.postDataJSON() as { reason: string; message: string };
    if (fake.decline === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.decline === 'cancelled') {
      fake.rows.splice(fake.rows.indexOf(row), 1);
      return route.fulfill(
        problem(409, {
          code: 'INVALID_TRANSITION',
          detail: `${row.customerName} cancelled this request.`,
          requestStatus: 'cancelled',
        }),
      );
    }
    fake.declines.push({ id, reason: body.reason, message: body.message });
    row.statusLabel = 'Declined';
    return route.fulfill({ json: decision(row, 'Declined') });
  });

  return fake;
}
