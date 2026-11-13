import type { Page, Route } from '@playwright/test';
import { type FakeStaff, miriam, type StaffMember, stubStaff } from './staff';

// A stand-in for the Jubilee team's listings and the takedown (L2-098 to L2-101, ADR 0057) and for
// the staff session of a team member in the admin application (L2-190). The requests the app makes
// are kept so a test can prove what it sent (ADR 0009).

export type AdminOutcome = 'ok' | 'fails';

export interface Takedown {
  at: string;
  byName: string;
  reason: string;
}

export interface FakeAdmin {
  listings: AdminOutcome | 'empty';
  listing: AdminOutcome;
  /** `fails` answers the next takedown with a 500. */
  takeDown: AdminOutcome;
  isOwnListing: boolean;
  /** Set once the opened listing was taken down. */
  takenDown: Takedown | null;
  /** The query string of every request for the list. */
  listRequests: string[];
  takedowns: { id: string; reason: string }[];
  /** The staff session the admin application reads. */
  staff: FakeStaff;
  /** Fields that replace the opened listing's, such as a space's `kind` and `space`. */
  fields: Record<string, unknown>;
  /** The owner's other listings and drafts, each with its stage (L2-079 AC3). */
  otherListings: { name: string; stageLabel: string }[];
  /** The owner's pronouns, shown to the Jubilee team only (L2-013 AC8); null when none were set. */
  ownerPronouns: string | null;
}

/** A published space (L2-200 AC3): the fields that replace the business of the default listing. */
export const SPACE_LISTING = {
  name: 'Bright basement apartment in the Annex',
  tagline: 'Quiet one-bedroom with its own entrance, near the subway',
  kind: 'space',
  categorySlug: 'rooms-rentals',
  categoryName: 'Rooms & rentals',
  flags: [],
  owner: {
    name: 'Grace Okafor',
    email: 'grace@okafor.example',
    emailConfirmed: true,
    memberSince: '2026-05-01T00:00:00Z',
    otherListings: [],
    pronouns: null,
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
  status: 'live' | 'paused' | 'on-hold',
  flagged = false,
) => ({
  id,
  name,
  categoryName: category,
  ownerName: owner,
  publishedAt: at,
  status,
  statusLabel: { live: 'Live', paused: 'Paused', 'on-hold': 'On hold' }[status],
  flagged,
});

/** The listings of the mock, newest published first (L2-099 AC2). */
export const ROWS = [
  row(
    LISTING_ID,
    'Luzandre.com',
    'Shops',
    'Naomi Laurent',
    '2026-11-10T09:40:00-05:00',
    'live',
    true,
  ),
  row(
    'a1',
    'Bright basement apartment in the Annex',
    'Rooms & rentals',
    'Grace Okafor',
    '2026-11-09T10:00:00-05:00',
    'live',
  ),
  row('a2', 'Okafor & Sons Furniture', 'Shops', 'Tobe Okafor', '2026-11-07T10:00:00-05:00', 'live'),
  row(
    'a3',
    'Park Insurance Brokers',
    'Financial & insurance',
    'Samuel Park',
    '2026-11-06T10:00:00-05:00',
    'live',
  ),
  row('a4', 'Flower Creations', 'Shops', 'Priya Thomas', '2026-10-22T10:00:00-04:00', 'paused'),
  row(
    'a5',
    'Moore’s Cleaning Service',
    'Home & property',
    'Lydia Moore',
    '2026-10-15T10:00:00-04:00',
    'on-hold',
  ),
];

export async function stubAdmin(
  page: Page,
  initial: Partial<Omit<FakeAdmin, 'staff'>> = {},
  staff: StaffMember = miriam,
): Promise<FakeAdmin> {
  const fake: FakeAdmin = {
    listings: 'ok',
    listing: 'ok',
    takeDown: 'ok',
    isOwnListing: false,
    takenDown: null,
    listRequests: [],
    takedowns: [],
    staff: undefined as unknown as FakeStaff,
    fields: {},
    ownerPronouns: 'she/her',
    otherListings: [{ name: 'Laurent Photography', stageLabel: 'Draft' }],
    ...initial,
  };

  fake.staff = await stubStaff(page, staff);

  const listing = () => ({
    id: LISTING_ID,
    slug: 'luzandre-com',
    name: 'Luzandre.com',
    tagline: 'Unique & custom Christian apparel, artworks & gifts that bring joy',
    about: null,
    kind: 'products',
    categorySlug: 'shops',
    categoryName: 'Shops',
    publishedAt: '2026-11-10T09:40:00-05:00',
    status: fake.takenDown ? 'taken-down' : 'live',
    statusLabel: fake.takenDown ? 'Taken down' : 'Live',
    owner: {
      name: 'Naomi Laurent',
      email: 'naomi@luzandre.example',
      emailConfirmed: true,
      memberSince: '2026-05-01T00:00:00Z',
      otherListings: fake.otherListings,
      pronouns: fake.ownerPronouns,
    },
    flags: ['CONTACT_IN_TEXT'],
    isOwnListing: fake.isOwnListing,
    takenDown: fake.takenDown,
    space: null,
    ...fake.fields,
  });

  await page.route('**/api/admin/listings**', (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split('/').filter(Boolean).slice(3); // after api/admin/listings
    if (parts.length === 0) {
      fake.listRequests.push(url.search);
      if (fake.listings === 'fails')
        return route.fulfill(problem(503, { reference: 'JB-ADM-503' }));
      if (fake.listings === 'empty') {
        return route.fulfill({ json: { total: 0, publishedThisWeek: 0, rows: [] } });
      }
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      return route.fulfill({
        json: {
          total: ROWS.length,
          publishedThisWeek: 4,
          rows: ROWS.filter((r) => r.name.toLowerCase().includes(q)),
        },
      });
    }
    const [id, action] = parts;
    if (!action) {
      if (fake.listing === 'fails') return route.fulfill(problem(503, { reference: 'JB-ADM-502' }));
      return route.fulfill({ json: listing() });
    }
    if (fake.takeDown === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    const reason = String((request.postDataJSON() as { reason?: string }).reason ?? '');
    if (!reason.trim()) {
      return route.fulfill(
        problem(422, { code: 'validation_failed', errors: { reason: 'REQUIRED' } }),
      );
    }
    fake.takedowns.push({ id, reason });
    fake.takenDown = { at: '2026-11-10T14:05:00-05:00', byName: staff.displayName, reason };
    return route.fulfill({ json: listing() });
  });

  return fake;
}
