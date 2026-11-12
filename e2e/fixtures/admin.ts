import type { Page, Route } from '@playwright/test';
import { type FakeStaff, miriam, type StaffMember, stubStaff } from './staff';

// A stand-in for the verification team's endpoints (L2-098 to L2-104) and for the staff session of
// a team member in the admin application (L2-190). The requests the app makes are kept so a test can prove what it sent (ADR 0009).

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
  /** The staff session the admin application reads. */
  staff: FakeStaff;
  /** Fields that replace the opened listing's, such as a space's `kind` and `space`. */
  listing: Record<string, unknown>;
  /** The owner's other listings and drafts, each with its stage (L2-079 AC3). */
  otherListings: { name: string; stageLabel: string }[];
}

/** A space under review (L2-200 AC3): the fields that replace the business of the default review. */
export const SPACE_REVIEW = {
  name: 'Bright basement apartment in the Annex',
  tagline: 'Quiet one-bedroom with its own entrance, near the subway',
  kind: 'space',
  categorySlug: 'rooms-rentals',
  categoryName: 'Rooms & rentals',
  owner: {
    name: 'Grace Okafor',
    email: 'grace@okafor.example',
    emailConfirmed: true,
    memberSince: '2026-05-01T00:00:00Z',
    otherListings: [{ name: 'Laurent Photography', stageLabel: 'Draft' }],
  },
  space: {
    term: 'long-term',
    rent: 1850,
    per: 'month',
    available: 'Dec 1',
    minimumStayLabel: '12-month lease',
    neighbourhood: 'The Annex',
    place: 'Basement apartment',
    facts: ['1 bedroom', '1 bath', '650 sq ft', 'Separate entrance'],
    included: ['Utilities', 'Wi-Fi', 'Laundry', 'Private bath'],
    household: null,
    rules: ['No smoking', 'Quiet after 10 pm', 'One small pet considered'],
  },
};

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
  at: string,
  stage: string,
  label: string,
) => ({
  id,
  name,
  categoryName: category,
  ownerName: owner,
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
    '2026-11-10T09:40:00-05:00',
    'ready-to-review',
    'Ready to review',
  ),
  row(
    'a1',
    'Laurent Photography',
    'Media',
    'Naomi Laurent',
    '2026-11-09T10:00:00-05:00',
    'ready-to-review',
    'Ready to review',
  ),
  row(
    'a2',
    'Okafor & Sons Furniture',
    'Shops',
    'Tobe Okafor',
    '2026-11-07T10:00:00-05:00',
    'ready-to-review',
    'Ready to review',
  ),
  row(
    'a3',
    'Park Insurance Brokers',
    'Financial & insurance',
    'Samuel Park',
    '2026-11-06T10:00:00-05:00',
    'ready-to-review',
    'Ready to review',
  ),
];

const STAGES = [
  ['ready-to-review', 'Ready to review'],
  ['changes-requested', 'Changes requested'],
] as const;

const CHECKS = [
  ['tagline', 'Tagline and description are honest and clear'],
  ['photos', 'At least one photo of the products or work'],
  ['category', 'Category fits what they offer'],
] as const;

export async function stubAdmin(
  page: Page,
  initial: Partial<Omit<FakeAdmin, 'staff'>> = {},
  staff: StaffMember = miriam,
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
    staff: undefined as unknown as FakeStaff,
    listing: {},
    otherListings: [{ name: 'Laurent Photography', stageLabel: 'Draft' }],
    ...initial,
  };

  fake.staff = await stubStaff(page, staff);

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
      otherListings: fake.otherListings,
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
    itemCount: 2,
    ...fake.listing,
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
          readyToReview: ROWS.length,
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
