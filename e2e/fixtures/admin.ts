import type { Page, Route } from '@playwright/test';

// A stand-in for the verification team's endpoints (L2-098 to L2-104) and for the session of a team
// member. The requests the app makes are kept so a test can prove what it sent (ADR 0009).

export type AdminOutcome = 'ok' | 'fails';

export interface FakeAdmin {
  queue: AdminOutcome | 'empty';
  review: AdminOutcome;
  /** `fails` answers the next decision with a 500. */
  decision: AdminOutcome;
  /** The stage the opened listing is in. */
  stage: string;
  /** The reason the listing cannot be decided on yet, if any. */
  cannotDecideBecause: string | null;
  isOwnListing: boolean;
  ticked: string[];
  queueRequests: string[];
  checklists: { id: string; ticked: string[] }[];
  approvals: { id: string; note: string | null }[];
  changeRequests: { id: string; areas: string[]; message: string }[];
  declines: { id: string; reason: string }[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export const LISTING_ID = '3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f';

const row = (
  id: string,
  name: string,
  category: string,
  owner: string,
  reference: string,
  at: string,
  stage: string,
  label: string,
) => ({
  id,
  name,
  categoryName: category,
  ownerName: owner,
  church: 'Grace Toronto Church',
  reference,
  submittedAt: at,
  stage,
  stageLabel: label,
  overdue: false,
});

const ROWS = [
  row(
    LISTING_ID,
    'Luzandre.com',
    'Shops',
    'Naomi Laurent',
    'confirmed',
    '2026-11-10T09:40:00-05:00',
    'ready-to-review',
    'Ready to review',
  ),
  row(
    'a1',
    'Laurent Photography',
    'Media',
    'Naomi Laurent',
    'waiting',
    '2026-11-09T10:00:00-05:00',
    'waiting-on-reference',
    'Waiting on reference',
  ),
  row(
    'a2',
    'Okafor & Sons Furniture',
    'Shops',
    'Tobe Okafor',
    'cant-vouch',
    '2026-11-07T10:00:00-05:00',
    'needs-a-decision',
    'Needs a decision',
  ),
  row(
    'a3',
    'Park Insurance Brokers',
    'Financial & insurance',
    'Samuel Park',
    'confirmed',
    '2026-11-06T10:00:00-05:00',
    'ready-to-review',
    'Ready to review',
  ),
];

const STAGES = [
  ['ready-to-review', 'Ready to review'],
  ['waiting-on-reference', 'Waiting on reference'],
  ['needs-a-decision', 'Needs a decision'],
  ['changes-requested', 'Changes requested'],
] as const;

const CHECKS = [
  ['owner-name', 'Owner’s name matches the reference'],
  ['reference', 'Reference confirmed and can vouch'],
  ['tagline', 'Tagline and description are honest and clear'],
  ['photos', 'At least one photo of the products or work'],
  ['category', 'Category fits what they offer'],
] as const;

export const esther = {
  signedIn: true,
  firstName: 'Esther',
  displayName: 'Esther Mensah',
  initials: 'EM',
  isVerifier: true,
};

export async function stubAdmin(
  page: Page,
  initial: Partial<FakeAdmin> = {},
  member = esther,
): Promise<FakeAdmin> {
  const fake: FakeAdmin = {
    queue: 'ok',
    review: 'ok',
    decision: 'ok',
    stage: 'ready-to-review',
    cannotDecideBecause: null,
    isOwnListing: false,
    ticked: CHECKS.map(([key]) => key),
    queueRequests: [],
    checklists: [],
    approvals: [],
    changeRequests: [],
    declines: [],
    ...initial,
  };

  await page.route('**/api/session', (r) => r.fulfill({ json: member }));
  await page.route('**/api/me/navigation', (r) =>
    r.fulfill({
      json: {
        unreadConversationCount: 2,
        unreadNotificationCount: 3,
        newRequestCount: 0,
        ownsListing: false,
        isVerifier: member.isVerifier,
        verificationCount: member.isVerifier ? 2 : 0,
      },
    }),
  );

  const review = () => ({
    id: LISTING_ID,
    slug: 'luzandre-com',
    name: 'Luzandre.com',
    tagline: 'Unique & custom Christian apparel, artworks & gifts that bring joy',
    about: null,
    kind: 'products',
    categorySlug: 'shops',
    categoryName: 'Shops',
    submittedAt: '2026-11-10T09:40:00-05:00',
    stage: fake.stage,
    stageLabel:
      fake.stage === 'declined'
        ? 'Declined'
        : (STAGES.find(([s]) => s === fake.stage)?.[1] ?? 'Live'),
    owner: {
      name: 'Naomi Laurent',
      email: 'naomi@luzandre.example',
      emailConfirmed: true,
      memberSince: '2026-05-01T00:00:00Z',
      otherListings: 1,
    },
    reference: {
      church: 'Grace Toronto Church',
      referenceEmail: 'daniel@grace.example',
      state: 'confirmed',
      answeredByName: 'Daniel Okoro',
      answeredByRole: 'Lead pastor',
      answeredAt: '2026-11-10T11:12:00-05:00',
      answer: 'vouches',
      note: 'Naomi has served on our hospitality team for six years.',
    },
    flags: [],
    checklist: CHECKS.map(([key, label]) => ({
      key,
      label,
      ticked: fake.ticked.includes(key),
      tickedBy: null,
      tickedAt: null,
    })),
    decision:
      fake.stage === 'live'
        ? {
            kind: 'Approved',
            decidedAt: '2026-11-10T14:05:00-05:00',
            decidedByName: 'Esther Mensah',
            note: null,
            areas: [],
          }
        : fake.stage === 'changes-requested'
          ? {
              kind: 'ChangesRequested',
              decidedAt: '2026-11-10T14:05:00-05:00',
              decidedByName: 'Esther Mensah',
              note: 'x',
              areas: ['tagline', 'photos'],
            }
          : null,
    changedSinceRequest: [],
    isOwnListing: fake.isOwnListing,
    cannotDecideBecause: fake.cannotDecideBecause,
  });

  const result = (stage: string, label: string) => ({
    stage,
    stageLabel: label,
    decidedAt: '2026-11-10T14:05:00-05:00',
    decidedByName: 'Esther Mensah',
    ownerFirstName: 'Naomi',
  });

  await page.route('**/api/admin/verifications**', (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split('/').filter(Boolean).slice(3); // after api/admin/verifications
    if (parts.length === 0) {
      fake.queueRequests.push(url.search);
      if (fake.queue === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-503' }));
      if (fake.queue === 'empty') {
        return route.fulfill({
          json: {
            total: 0,
            readyToReview: 0,
            oldestWaitingDays: null,
            filter: 'ready-to-review',
            tabs: [],
            rows: [],
          },
        });
      }
      const filter = url.searchParams.get('stage') ?? 'ready-to-review';
      return route.fulfill({
        json: {
          total: ROWS.length,
          readyToReview: 2,
          oldestWaitingDays: 4,
          filter,
          tabs: STAGES.map(([stage, label]) => ({
            stage,
            label,
            count: ROWS.filter((r) => r.stage === stage).length,
          })),
          rows: ROWS.filter((r) => r.stage === filter),
        },
      });
    }
    const [id, action] = parts;
    if (!action) {
      if (fake.review === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-502' }));
      return route.fulfill({ json: review() });
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    if (action === 'checklist') {
      fake.checklists.push({ id, ticked: body['ticked'] as string[] });
      fake.ticked = body['ticked'] as string[];
      return route.fulfill({ json: [] });
    }
    if (fake.decision === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (action === 'approve') {
      if (fake.ticked.length < CHECKS.length && !String(body['note'] ?? '').trim()) {
        return route.fulfill(
          problem(422, { code: 'validation_failed', errors: { note: 'NOTE_REQUIRED' } }),
        );
      }
      fake.approvals.push({ id, note: (body['note'] as string | null) ?? null });
      fake.stage = 'live';
      return route.fulfill({ json: result('live', 'Live') });
    }
    if (action === 'request-changes') {
      fake.changeRequests.push({
        id,
        areas: body['areas'] as string[],
        message: body['message'] as string,
      });
      fake.stage = 'changes-requested';
      return route.fulfill({ json: result('changes-requested', 'Changes requested') });
    }
    fake.declines.push({ id, reason: body['reason'] as string });
    fake.stage = 'declined';
    return route.fulfill({ json: result('declined', 'Declined') });
  });

  return fake;
}
