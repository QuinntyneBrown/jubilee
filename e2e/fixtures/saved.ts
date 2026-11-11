import type { Page, Route } from '@playwright/test';

// A stand-in for the member's saved list (L2-041, L2-042). What the app sends is kept so a test can prove it (ADR 0009).

interface FakeCard {
  slug: string;
  name: string;
  tagline: string;
  highlight: string | null;
  categorySlug: string;
  verified: boolean;
  coverPhoto: null;
}

export interface FakeSavedItem {
  id: string;
  kind: 'business' | 'product';
  name: string;
  savedAt: string;
  available: boolean;
  business: FakeCard | null;
  product: {
    slug: string;
    businessSlug: string;
    name: string;
    shopName: string;
    priceCents: number;
    perUnit: boolean;
    tile: { tint: string; icon: string };
  } | null;
}

export interface FakeSaved {
  /** `fails` answers the list with a 503. */
  list: 'ok' | 'fails';
  /** `offline` answers a save with a 503; `limit` with 409 SAVED_LIMIT_REACHED. */
  save: 'ok' | 'offline' | 'limit';
  items: FakeSavedItem[];
  /** The calls the app made, as "PUT businesses/luzandre". */
  calls: string[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const card = (
  slug: string,
  name: string,
  tagline: string,
  categorySlug: string,
  highlight: string,
): FakeCard => ({
  slug,
  name,
  tagline,
  highlight,
  categorySlug,
  verified: true,
  coverPhoto: null,
});

export const SAVED_ITEMS: FakeSavedItem[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    kind: 'product',
    name: 'Leather journaling Bible, ESV',
    savedAt: '2026-11-10T14:00:00Z',
    available: true,
    business: null,
    product: {
      slug: 'journaling-bible',
      businessSlug: 'christian-bookstores',
      name: 'Leather journaling Bible, ESV',
      shopName: 'Christian Bookstores',
      priceCents: 6400,
      perUnit: false,
      tile: { tint: 'gold', icon: 'book' },
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    kind: 'business',
    name: 'Flower Creations',
    savedAt: '2026-11-09T14:00:00Z',
    available: true,
    business: card(
      'flower-creations',
      'Flower Creations',
      'Fresh Blooms for Every Occasion',
      'shops',
      'Same-day delivery',
    ),
    product: null,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    kind: 'business',
    name: 'WaterWorks Plumbing & Drains',
    savedAt: '2026-11-08T14:00:00Z',
    available: true,
    business: card(
      'waterworks',
      'WaterWorks Plumbing & Drains',
      'Treating Every Customer As Family',
      'home-property',
      'Emergency calls',
    ),
    product: null,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    kind: 'business',
    name: 'Legacy Financial',
    savedAt: '2026-11-07T14:00:00Z',
    available: true,
    business: card(
      'legacy-financial',
      'Legacy Financial',
      'Build a Legacy. Protect a Legacy. Leave a Legacy.',
      'financial-insurance',
      'Free first meeting',
    ),
    product: null,
  },
];

export const PAUSED: FakeSavedItem = {
  id: 'a1000000-0000-4000-8000-000000000009',
  kind: 'business',
  name: 'Harbour Bakery',
  savedAt: '2026-11-01T14:00:00Z',
  available: false,
  business: null,
  product: null,
};

export async function stubSaved(
  page: Page,
  initial: Partial<Pick<FakeSaved, 'list' | 'save'>> & { items?: FakeSavedItem[] } = {},
): Promise<FakeSaved> {
  const fake: FakeSaved = {
    list: 'ok',
    save: 'ok',
    items: structuredClone(SAVED_ITEMS),
    calls: [],
    ...initial,
  };
  if (initial.items) fake.items = structuredClone(initial.items);

  const body = () => ({
    businessCount: fake.items.filter((i) => i.available && i.kind === 'business').length,
    productCount: fake.items.filter((i) => i.available && i.kind === 'product').length,
    items: fake.items,
  });

  await page.route(/\/api\/saved(\/.*)?$/, (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api\/saved\/?/, '');
    if (request.method() === 'GET') {
      if (fake.list === 'fails') return route.fulfill(problem(503, { reference: 'JB-SAV-503' }));
      return route.fulfill({ json: body() });
    }
    fake.calls.push(`${request.method()} ${path}`);
    if (request.method() === 'PUT') {
      if (fake.save === 'offline') return route.fulfill(problem(503, { reference: 'JB-SAV-504' }));
      if (fake.save === 'limit')
        return route.fulfill(problem(409, { code: 'SAVED_LIMIT_REACHED' }));
    }
    if (request.method() === 'DELETE' && path.startsWith('items/')) {
      const id = path.slice('items/'.length);
      fake.items = fake.items.filter((item) => item.id !== id);
    }
    return route.fulfill({ status: 204 });
  });

  return fake;
}
