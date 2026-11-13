import type { Page, Route } from '@playwright/test';
import { stubAdmin } from './admin';
import { miriam, type FakeStaff, type StaffMember } from './staff';

// A stand-in for the Jubilee team's reports and featured businesses (L2-105, L2-106). The
// requests the app makes are kept so a test can prove what it sent (ADR 0009).

export const REPORT_ID = '5b0c7a10-2d4e-4f6a-8b1c-0123456789ab';
export const CONVERSATION_REPORT_ID = '6c1d8b21-3e5f-4a7b-9c2d-123456789abc';
export const REVIEW_REPORT_ID = '7d2e9c32-4f60-4b8c-8d3e-23456789abcd';

/** The actions the API takes on a report of a review; the listing's are refused (L2-237 AC2). */
const REVIEW_ACTIONS = ['dismiss', 'message-reporter', 'take-down'];

export interface FakeModeration {
  reports: 'ok' | 'empty' | 'fails';
  /** The list also holds a report of a review (L2-237). */
  reviewReport: boolean;
  /** The reported review was taken down. */
  takenDown: boolean;
  featured: 'ok' | 'fails';
  save: 'ok' | 'overlaps' | 'fails';
  listingState: string;
  status: string;
  statusRequests: string[];
  opened: string[];
  actions: { id: string; kind: string; resolutionNote: string; messageText: string | null }[];
  saved: { startDate: string; ids: string[] }[];
  /** The staff session the admin bar reads its count from (L2-190 AC7). */
  staff: FakeStaff;
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const item = (id: string, type: string, name: string, reason: string, overdue: boolean) => ({
  id,
  type,
  listing: { name, slug: name.toLowerCase().replace(/\W+/g, '-') },
  reason,
  description:
    type === 'conversation' ? 'They asked me to pay outside Jubilee.' : 'Not what it says.',
  reporterName: 'Samuel Park',
  createdAt: '2026-11-09T10:00:00-05:00',
  status: 'open',
  overdue,
});

const CANDIDATES = [
  ['f1', 'Legacy Financial', 'financial-insurance'],
  ['f2', 'WaterWorks Plumbing & Drains', 'home-property'],
  ['f3', 'Flower Creations', 'home-property'],
  ['f4', 'Luzandre.com', 'shops'],
  ['f5', 'Laurent Photography', 'media'],
  ['f6', 'Park Insurance Brokers', 'financial-insurance'],
].map(([id, name, categorySlug]) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\W+/g, '-'),
  tagline: 'A tagline',
  categorySlug,
  state: 'live',
}));

export async function stubModeration(
  page: Page,
  initial: Partial<FakeModeration> = {},
  staff: StaffMember = miriam,
): Promise<FakeModeration> {
  const fake: FakeModeration = {
    reports: 'ok',
    reviewReport: false,
    takenDown: false,
    featured: 'ok',
    save: 'ok',
    listingState: 'live',
    status: 'open',
    statusRequests: [],
    opened: [],
    actions: [],
    saved: [],
    staff: undefined as unknown as FakeStaff,
    ...initial,
  };
  fake.staff = (await stubAdmin(page, {}, staff)).staff;

  const actionsOf = (id: string) =>
    fake.actions
      .filter((a) => a.id === id)
      .map((a) => ({
        kind: a.kind,
        resolutionNote: a.resolutionNote,
        messageText: a.messageText,
        by: 'Esther Mensah',
        at: '2026-11-11T09:00:00-05:00',
      }));

  // A report of a review: the review as it stands and every report of it (L2-237 AC2).
  const reviewDetail = () => ({
    id: REVIEW_REPORT_ID,
    type: 'review',
    status: fake.status,
    overdue: false,
    createdAt: '2026-11-10T09:40:00-05:00',
    reporterName: 'Mary Osei',
    listing: {
      name: 'WaterWorks Plumbing & Drains',
      slug: 'waterworks-plumbing-drains',
      state: 'live',
    },
    entries: [
      {
        reason: 'It’s advertising or off-topic',
        description: '',
        at: '2026-11-09T19:12:00-05:00',
      },
      {
        reason: 'It shares private details',
        description: 'It has a phone number in it and names one of their plumbers.',
        at: '2026-11-10T09:40:00-05:00',
      },
    ],
    conversation: null,
    review: {
      author: 'Daniel R.',
      initials: 'DR',
      rating: 1,
      itemName: 'Blocked drain',
      text: 'The plumber who came, Mike, was rude and left a mess. Call me on 416-555-0142 and I’ll tell you the whole story.',
      createdAt: '2026-11-08T12:00:00-05:00',
      editedAt: null,
      reply: null,
      takenDown: fake.takenDown,
    },
    actions: actionsOf(REVIEW_REPORT_ID),
    resolutionNote: null,
  });

  const detail = (id: string) => {
    if (id === REVIEW_REPORT_ID) return reviewDetail();
    const conversation = id === CONVERSATION_REPORT_ID;
    return {
      id,
      type: conversation ? 'conversation' : 'listing',
      status: fake.status,
      overdue: false,
      createdAt: '2026-11-09T10:00:00-05:00',
      reporterName: 'Samuel Park',
      listing: { name: 'Luzandre.com', slug: 'luzandre-com', state: fake.listingState },
      entries: [
        {
          reason: conversation ? 'Pressure to pay outside Jubilee' : 'Misleading',
          description: 'Not what it says.',
          at: '2026-11-09T10:00:00-05:00',
        },
      ],
      conversation:
        conversation && fake.status !== 'resolved'
          ? {
              memberName: 'Samuel Park',
              messages: [
                {
                  from: 'Samuel Park',
                  fromOwner: false,
                  body: 'Can I book for Friday?',
                  at: '2026-11-08T09:00:00-05:00',
                },
                {
                  from: 'Naomi Laurent',
                  fromOwner: true,
                  body: 'Send the money to my cousin first.',
                  at: '2026-11-08T09:05:00-05:00',
                },
              ],
            }
          : null,
      actions: actionsOf(id),
      resolutionNote: null,
    };
  };

  await page.route('**/api/admin/reports**', (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split('/').filter(Boolean).slice(3);
    if (parts.length === 0) {
      fake.statusRequests.push(url.searchParams.get('status') ?? '');
      if (fake.reports === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-511' }));
      const items =
        fake.reports === 'empty'
          ? []
          : [
              item(REPORT_ID, 'listing', 'Luzandre.com', 'Misleading', true),
              item(
                CONVERSATION_REPORT_ID,
                'conversation',
                'Luzandre.com',
                'Pressure to pay outside Jubilee',
                false,
              ),
              ...(fake.reviewReport
                ? [
                    item(
                      REVIEW_REPORT_ID,
                      'review',
                      'WaterWorks Plumbing & Drains',
                      'It shares private details',
                      false,
                    ),
                  ]
                : []),
            ];
      return route.fulfill({
        json: {
          items,
          unresolvedCount: items.length,
          overdueCount: items.filter((i) => i.overdue).length,
        },
      });
    }
    const [id, action] = parts;
    if (action === 'open') {
      fake.opened.push(id);
      if (fake.status === 'open') fake.status = 'in-review';
      return route.fulfill({ json: detail(id) });
    }
    const body = request.postDataJSON() as {
      kind: string;
      resolutionNote: string;
      messageText: string | null;
    };
    if (id === REVIEW_REPORT_ID && !REVIEW_ACTIONS.includes(body.kind)) {
      return route.fulfill(
        problem(422, { code: 'validation_failed', errors: { kind: 'INVALID' } }),
      );
    }
    if (!body.resolutionNote?.trim()) {
      return route.fulfill(
        problem(422, { code: 'validation_failed', errors: { resolutionNote: 'REQUIRED' } }),
      );
    }
    if (body.kind === 'take-down' && !body.messageText?.trim()) {
      return route.fulfill(
        problem(422, { code: 'validation_failed', errors: { messageText: 'REQUIRED' } }),
      );
    }
    fake.actions.push({ id, ...body });
    if (body.kind === 'take-down') {
      fake.status = 'resolved';
      fake.takenDown = true;
    }
    if (body.kind === 'dismiss' || body.kind === 'remove' || body.kind === 'lift-hold')
      fake.status = 'resolved';
    if (body.kind === 'hold') fake.listingState = 'on-hold';
    if (body.kind === 'remove') fake.listingState = 'removed';
    if (body.kind === 'lift-hold') fake.listingState = 'live';
    return route.fulfill({ json: { ...detail(id), conversation: null } });
  });

  await page.route('**/api/admin/featured**', (route: Route) => {
    const url = new URL(route.request().url());
    if (fake.featured === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-513' }));
    if (url.pathname.endsWith('/candidates')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      return route.fulfill({
        json: { items: CANDIDATES.filter((c) => c.name.toLowerCase().includes(q)) },
      });
    }
    const weeks = fake.saved.length
      ? [
          {
            startDate: fake.saved[fake.saved.length - 1].startDate,
            endDate: '2026-11-17',
            active: true,
            listings: fake.saved[fake.saved.length - 1].ids.map((id) =>
              CANDIDATES.find((c) => c.id === id),
            ),
          },
        ]
      : [];
    return route.fulfill({ json: { weeks } });
  });

  await page.route('**/api/admin/featured-weeks/**', (route: Route) => {
    if (fake.save === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.save === 'overlaps') {
      return route.fulfill(
        problem(422, { code: 'validation_failed', errors: { startDate: 'WEEK_OVERLAPS' } }),
      );
    }
    const startDate = new URL(route.request().url()).pathname.split('/').pop() as string;
    const { listingIds } = route.request().postDataJSON() as { listingIds: string[] };
    fake.saved.push({ startDate, ids: listingIds });
    return route.fulfill({
      json: { startDate, endDate: '2026-11-17', active: true, listings: [] },
    });
  });

  return fake;
}
