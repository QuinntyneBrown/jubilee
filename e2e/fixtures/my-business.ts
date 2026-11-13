import type { Page, Route } from '@playwright/test';
import { naomi } from './incoming-requests';

// A stand-in for the owner's workspace (L2-085 to L2-088, L2-096) and for the session of an owner.
// What the app sends is kept so a test can prove it (ADR 0009).

export type Outcome = 'ok' | 'fails';

export interface FakePhoto {
  id: string;
  key: string;
  position: number;
  alt: string;
  customAlt: string | null;
  width: number;
  height: number;
}

/** One entry of the switcher on My business (L2-079 AC4). */
export interface FakeBusinessOption {
  id: string;
  name: string;
  kind: 'listing' | 'draft';
  stageLabel: string;
  current: boolean;
  /** The state My business shows once this listing is chosen. */
  state?: string;
}

export const LUZANDRE = '7c1d0000-0000-4000-8000-000000000001';
export const LAURENT_PHOTOGRAPHY = '7c1d0000-0000-4000-8000-000000000002';
export const LAURENT_STUDIO = '7c1d0000-0000-4000-8000-0000000000d1';

/** Naomi's other business, live too, and a draft she has not published. */
export const OTHER_BUSINESSES: FakeBusinessOption[] = [
  {
    id: LAURENT_PHOTOGRAPHY,
    name: 'Laurent Photography',
    kind: 'listing',
    stageLabel: 'Live',
    current: false,
    state: 'live',
  },
  {
    id: LAURENT_STUDIO,
    name: 'Laurent Studio',
    kind: 'draft',
    stageLabel: 'Draft',
    current: false,
  },
];

export interface FakeBusiness {
  /** `fails` answers the overview with a 503; `forbidden` with a 403. */
  overview: Outcome | 'forbidden';
  editor: Outcome | 'forbidden';
  /** `conflict` answers the save as if another tab had saved first (409). */
  save: Outcome | 'conflict';
  pause: Outcome;
  /** How a change of a photo's place is answered. */
  move: Outcome;
  resume: Outcome;
  /** How saving the away period is answered; `in-past` refuses the date (422). */
  away: Outcome | 'in-past';
  /** The instant the owner is back, or null (L2-062). */
  awayUntil: string | null;
  /** What was sent to the away endpoint, in order. */
  aways: (string | null)[];
  /** The refusal of the next photo upload, by the API's code; null accepts it. */
  photoRefusal: { status: number; code: string } | null;
  state: string;
  /** The listing's slug; a save that changes the name moves it, as the API does (L2-245 AC1). */
  slug: string;
  /** The domain of listing addresses; null where none is set, as in the recording (L2-244 AC6). */
  addressDomain: string | null;
  /** The owner's other listings and drafts, after the one the fake describes (L2-079). */
  others: FakeBusinessOption[];
  /** How choosing another business is answered. */
  choose: Outcome;
  /** The listings chosen in the switcher, in order. */
  choices: string[];
  paused: boolean;
  /** "Saved by members": the members who saved the business, and those who first did so this week (L2-085 AC6). */
  saved: { value: number; change: number };
  version: number;
  photos: FakePhoto[];
  listing: {
    name: string;
    tagline: string;
    categorySlug: string;
    about: string;
    where: string;
    hours: string;
    website: string;
    highlight: string;
    /** A space's own fields (L2-209); absent for a business. */
    space?: Record<string, unknown> | null;
  };
  saves: Record<string, unknown>[];
  pauses: number;
  resumes: number;
  uploads: number;
  moves: { id: string; position: number }[];
  descriptions: { id: string; alt: string }[];
  removals: string[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const CATEGORIES = [
  { slug: 'shops', name: 'Shops' },
  { slug: 'financial-insurance', name: 'Financial & insurance' },
  { slug: 'home-property', name: 'Home & property' },
];

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

/** The guest suite of the design reference, as its owner's editor opens it (L2-209). */
export const SUITE: FakeBusiness['listing'] = {
  name: 'Guest suite near Roncesvalles',
  tagline: 'Private suite for visiting family, conferences or a weekend away',
  categorySlug: 'rooms-rentals',
  about:
    'Ten minutes’ walk to High Park and the Queen streetcar. Members of our church get a quiet, clean place to land.',
  where: 'Roncesvalles',
  hours: '',
  website: '',
  highlight: '',
  space: {
    term: 'short-stay',
    rent: 120,
    available: 'Most weekends',
    minimumStay: 2,
    neighbourhood: 'Roncesvalles',
    address: '112 Fermanagh Ave, Toronto, ON M6R 1M2',
    place: 'Guest suite',
    facts: ['Queen bed', 'Private bath', 'Sleeps 2', 'Self check-in'],
    included: ['Wi-Fi', 'Furnished', 'Parking', 'Private bath'],
    household: null,
    rules: ['Check-in after 3 pm', 'No parties', 'No smoking'],
  },
};

export const SAMUEL = '5d0b1c2e-0000-4000-8000-000000000001';

export async function stubMyBusiness(
  page: Page,
  initial: Partial<FakeBusiness> = {},
  member = naomi,
): Promise<FakeBusiness> {
  let next = 0;
  const fake: FakeBusiness = {
    overview: 'ok',
    editor: 'ok',
    save: 'ok',
    pause: 'ok',
    move: 'ok',
    away: 'ok',
    awayUntil: null,
    aways: [],
    resume: 'ok',
    photoRefusal: null,
    state: 'live',
    slug: 'luzandre-com',
    addressDomain: null,
    others: [],
    choose: 'ok',
    choices: [],
    paused: false,
    saved: { value: 28, change: 4 },
    version: 0,
    photos: [],
    listing: {
      name: 'Luzandre.com',
      tagline: 'Unique & custom Christian apparel, artworks & gifts that bring joy',
      categorySlug: 'shops',
      about: 'Custom tees, mugs and original artwork designed to share joy.',
      where: 'Online · studio pickup in Leslieville',
      hours: 'Mon–Sat 10:00–6:00',
      website: 'https://luzandre.com',
      highlight: 'Ships across Canada',
    },
    saves: [],
    pauses: 0,
    resumes: 0,
    uploads: 0,
    moves: [],
    descriptions: [],
    removals: [],
    ...initial,
  };

  const photos = () =>
    fake.photos
      .toSorted((a, b) => a.position - b.position)
      .map((photo, index) => ({
        ...photo,
        position: index + 1,
        alt: photo.customAlt ?? `${fake.listing.name} photo ${index + 1}`,
      }));

  const address = () => (fake.addressDomain ? `https://${fake.slug}.${fake.addressDomain}` : null);

  const editor = () => ({
    id: LUZANDRE,
    version: fake.version,
    slug: fake.slug,
    address: address(),
    stage: fake.state === 'paused' ? 'live' : fake.state,
    paused: fake.paused,
    ...fake.listing,
    categories: CATEGORIES,
    photos: photos(),
    subtitle: fake.paused ? 'Paused · not public' : 'Live since June 2026',
  });

  let current = LUZANDRE;
  const first = { name: fake.listing.name, state: fake.state };
  const businesses = (): FakeBusinessOption[] => [
    {
      id: LUZANDRE,
      name: first.name,
      kind: 'listing',
      stageLabel: fake.paused && current === LUZANDRE ? 'Paused' : 'Live',
      current: current === LUZANDRE,
    },
    ...fake.others.map(({ state: _state, ...option }) => ({
      ...option,
      current: option.id === current,
    })),
  ];

  const overview = () => {
    if (fake.state === 'none') {
      return {
        state: 'none',
        listingId: null,
        name: null,
        slug: null,
        tagline: null,
        categorySlug: null,
        categoryName: null,
        subtitle: "You haven't listed a business yet",
        paused: false,
        pausedAt: null,
        newRequests: 0,
        stats: null,
        needsReply: [],
        summary: null,
        businesses: [],
      };
    }
    const live = fake.state === 'live' || fake.state === 'paused';
    return {
      state: fake.paused ? 'paused' : fake.state,
      listingId: current,
      businesses: businesses(),
      name: fake.listing.name,
      slug: fake.slug,
      address: address(),
      tagline: fake.listing.tagline,
      categorySlug: fake.listing.categorySlug,
      categoryName: fake.listing.categorySlug === 'rooms-rentals' ? 'Rooms & rentals' : 'Shops',
      subtitle: fake.paused
        ? 'Paused · not public'
        : live
          ? 'Live since June 2026'
          : 'Draft · not published yet',
      paused: fake.paused,
      pausedAt: fake.paused ? '2026-11-10T14:00:00Z' : null,
      awayUntil: fake.awayUntil,
      newRequests: 3,
      stats: live
        ? {
            views: { value: 312, change: 48 },
            openRequests: 3,
            newSinceYesterday: 2,
            unansweredMessages: 1,
            saved: fake.saved,
          }
        : null,
      needsReply: live
        ? [
            {
              id: SAMUEL,
              kind: 'order',
              kindLabel: 'Order',
              customerName: 'Samuel Park',
              title: 'Custom church team tee × 24',
              sentAt: '2026-11-10T08:15:00-05:00',
            },
            {
              id: '5d0b1c2e-0000-4000-8000-000000000003',
              kind: 'quote',
              kindLabel: 'Quote',
              customerName: 'David Chen',
              title: 'Church merch package',
              sentAt: '2026-11-08T10:00:00-05:00',
            },
          ]
        : [],
      summary: live
        ? { products: 4, soldOut: 1, services: 2, liveSince: 'Live since Jun 2026' }
        : null,
    };
  };

  await page.route('**/api/session', (r) => r.fulfill({ json: member }));
  await page.route('**/api/me/navigation', (r) =>
    r.fulfill({
      json: {
        unreadConversationCount: 2,
        unreadNotificationCount: 3,
        newRequestCount: 3,
        ownsListing: true,
        isModerator: false,
      },
    }),
  );
  // Photos are served from /media/; so is the app's bundled font, which must still load.
  await page.route('**/media/**', (r) =>
    /\.woff2?(\?|$)/.test(r.request().url())
      ? r.fallback()
      : r.fulfill({ body: PNG, contentType: 'image/png' }),
  );

  await page.route(/\/api\/my-business$/, (route: Route) => {
    if (fake.overview === 'fails') return route.fulfill(problem(503, { reference: 'JB-BIZ-503' }));
    if (fake.overview === 'forbidden') return route.fulfill(problem(403, { code: 'FORBIDDEN' }));
    return route.fulfill({ json: overview() });
  });

  await page.route(/\/api\/my-business\/current$/, (route: Route) => {
    const { listingId } = route.request().postDataJSON() as { listingId: string };
    fake.choices.push(listingId);
    if (fake.choose === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    const chosen = fake.others.find((option) => option.id === listingId);
    current = listingId;
    fake.listing = { ...fake.listing, name: chosen?.name ?? first.name };
    fake.state = chosen?.state ?? first.state;
    return route.fulfill({ status: 204 });
  });

  await page.route(/\/api\/my-business\/(listing|pause|resume|away|photos.*)$/, (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/my-business/', '');
    const method = request.method();
    if (path === 'listing' && method === 'GET') {
      if (fake.editor === 'fails') return route.fulfill(problem(503, { reference: 'JB-LST-503' }));
      if (fake.editor === 'forbidden') return route.fulfill(problem(403, { code: 'FORBIDDEN' }));
      return route.fulfill({ json: editor() });
    }
    if (path === 'listing') {
      const body = request.postDataJSON() as Record<string, string | number>;
      fake.saves.push(body);
      if (fake.save === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      if (fake.save === 'conflict') {
        return route.fulfill(
          problem(409, {
            code: 'LISTING_CHANGED',
            detail: 'This listing changed since you opened it. Reload to see the latest.',
          }),
        );
      }
      fake.version += 1;
      fake.listing = {
        name: String(body['name']),
        tagline: String(body['tagline']),
        categorySlug: String(body['category']),
        about: String(body['about']),
        where: String(body['where']),
        hours: String(body['hours']),
        website: String(body['website']),
        highlight: String(body['highlight']),
        space: (body['space'] as unknown as Record<string, unknown> | undefined) ?? null,
      };
      return route.fulfill({ json: editor() });
    }
    if (path === 'away') {
      if (fake.away === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      if (fake.away === 'in-past') {
        return route.fulfill(problem(422, { code: 'VALIDATION', errors: { until: 'IN_PAST' } }));
      }
      const { until } = request.postDataJSON() as { until: string | null };
      fake.aways.push(until);
      // The period ends at the start of that day in Toronto.
      fake.awayUntil = until ? `${until}T05:00:00Z` : null;
      return route.fulfill({ json: { awayUntil: fake.awayUntil } });
    }
    if (path === 'pause') {
      if (fake.pause === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      fake.pauses += 1;
      fake.paused = true;
      return route.fulfill({
        json: {
          paused: true,
          pausedAt: '2026-11-10T14:00:00Z',
          state: 'paused',
        },
      });
    }
    if (path === 'resume') {
      if (fake.resume === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      fake.resumes += 1;
      fake.paused = false;
      return route.fulfill({ json: { paused: false, pausedAt: null, state: fake.state } });
    }
    // photos
    const [, id, what] = path.split('/');
    if (method === 'POST') {
      if (fake.photoRefusal) {
        return route.fulfill(problem(fake.photoRefusal.status, { code: fake.photoRefusal.code }));
      }
      fake.uploads += 1;
      next += 1;
      fake.photos.push({
        id: `9e1d0000-0000-4000-8000-0000000000${String(next).padStart(2, '0')}`,
        key: String(next).padStart(32, 'a'),
        position: fake.photos.length + 1,
        alt: '',
        customAlt: null,
        width: 800,
        height: 600,
      });
      return route.fulfill({ status: 201, json: editor() });
    }
    if (method === 'DELETE') {
      fake.removals.push(id);
      fake.photos = fake.photos.filter((photo) => photo.id !== id);
      return route.fulfill({ json: editor() });
    }
    const body = request.postDataJSON() as { position?: number; alt?: string };
    if (what === 'position') {
      fake.moves.push({ id, position: body.position! });
      if (fake.move === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      const ordered = photos();
      const moving = ordered.find((photo) => photo.id === id)!;
      ordered.splice(ordered.indexOf(moving), 1);
      ordered.splice(body.position! - 1, 0, moving);
      ordered.forEach((photo, index) => {
        fake.photos.find((item) => item.id === photo.id)!.position = index + 1;
      });
      return route.fulfill({ json: editor() });
    }
    fake.descriptions.push({ id, alt: body.alt! });
    fake.photos.find((photo) => photo.id === id)!.customAlt = body.alt?.trim() || null;
    return route.fulfill({ json: editor() });
  });

  // The confirm and decline dialogs answer through the owner's requests API.
  await page.route(/\/api\/my-business\/requests\/[^/]+\/(confirm|decline)$/, (route: Route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2)!;
    const confirm = route.request().url().endsWith('/confirm');
    return route.fulfill({
      json: {
        id,
        status: confirm ? 'Confirmed' : 'Declined',
        statusLabel: confirm ? 'Confirmed' : 'Declined',
        kind: 'order',
        customerFirstName: 'Samuel',
        undoUntil: null,
      },
    });
  });

  return fake;
}
