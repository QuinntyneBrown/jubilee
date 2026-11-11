import type { Page, Route } from '@playwright/test';
import { naomi } from './incoming-requests';

// A stand-in for the owner's products and services (L2-089 to L2-095) and for the session of an
// owner. What the app sends is kept so a test can prove it (ADR 0009).

export type CatalogueOutcome = 'ok' | 'fails' | 'forbidden';

interface FakeProduct {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  perUnit: boolean;
  stock: number | null;
  description: string | null;
  minimumQuantity: number;
  requests: number;
}

interface FakeService {
  id: string;
  name: string;
  detail: string;
  priceKind: 'free' | 'amount' | 'ask';
  priceCents: number | null;
  action: 'book' | 'ask';
  durationMinutes: number | null;
  offersVideo: boolean;
  offersInPerson: boolean;
  inPersonPlace: string | null;
}

export interface FakeCatalogue {
  /** `fails` answers the list with a 503; `forbidden` with a 403. */
  products: CatalogueOutcome;
  services: CatalogueOutcome;
  /** `fails` answers the save with a 500, `hangs` never answers, `limit` refuses it with a 409. */
  save: 'ok' | 'fails' | 'hangs' | 'limit';
  remove: 'ok' | 'fails';
  move: 'ok' | 'fails';
  productRows: FakeProduct[];
  serviceRows: FakeService[];
  productSaves: Record<string, unknown>[];
  serviceSaves: Record<string, unknown>[];
  deleted: string[];
  moves: { id: string; position: number }[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

const product = (
  id: number,
  name: string,
  priceCents: number,
  extra: Partial<FakeProduct> = {},
): FakeProduct => ({
  id: `a1000000-0000-4000-8000-0000000000${String(id).padStart(2, '0')}`,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  priceCents,
  perUnit: false,
  stock: 5,
  description: null,
  minimumQuantity: 1,
  requests: 0,
  ...extra,
});

export const PRODUCTS = [
  product(1, 'Faith heavyweight tee, charcoal', 3400, { stock: 0, requests: 41 }),
  product(2, 'Gold cross stoneware mug', 2400, { requests: 26 }),
  product(3, 'Custom church team tee', 2200, { perUnit: true, minimumQuantity: 12, requests: 12 }),
  product(4, 'Morning mug, set of two', 4200, { requests: 9 }),
];

export const SERVICES: FakeService[] = [
  {
    id: 'b2000000-0000-4000-8000-000000000001',
    name: 'Custom design consultation',
    detail: '',
    priceKind: 'free',
    priceCents: null,
    action: 'book',
    durationMinutes: 30,
    offersVideo: true,
    offersInPerson: false,
    inPersonPlace: null,
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    name: 'Church merch package',
    detail: 'Tees, mugs and totes for your congregation',
    priceKind: 'ask',
    priceCents: null,
    action: 'ask',
    durationMinutes: null,
    offersVideo: true,
    offersInPerson: false,
    inPersonPlace: null,
  },
];

const cents = (text: string) => Math.round(Number(text) * 100);

export async function stubCatalogue(
  page: Page,
  initial: Partial<FakeCatalogue> = {},
  member = naomi,
): Promise<FakeCatalogue> {
  let next = 50;
  const fake: FakeCatalogue = {
    products: 'ok',
    services: 'ok',
    save: 'ok',
    remove: 'ok',
    move: 'ok',
    productRows: structuredClone(PRODUCTS),
    serviceRows: structuredClone(SERVICES),
    productSaves: [],
    serviceSaves: [],
    deleted: [],
    moves: [],
    ...initial,
  };

  const productView = (row: FakeProduct) => ({
    ...row,
    soldOut: row.stock === 0,
    tint: 'gold',
    icon: 'bag',
    optionName: null,
    options: [],
  });

  const products = () => ({
    business: 'Luzandre.com',
    slug: 'luzandre-com',
    subtitle: 'Verified · live since June 2026',
    live: true,
    total: fake.productRows.length,
    soldOut: fake.productRows.filter((row) => row.stock === 0).length,
    max: 100,
    rows: fake.productRows.map(productView),
  });

  const services = () => ({
    business: 'Luzandre.com',
    slug: 'luzandre-com',
    subtitle: 'Verified · live since June 2026',
    live: true,
    total: fake.serviceRows.length,
    max: 50,
    rows: fake.serviceRows,
  });

  const listFailure = (outcome: CatalogueOutcome, reference: string) => {
    if (outcome === 'fails') return problem(503, { reference });
    if (outcome === 'forbidden') return problem(403, { code: 'FORBIDDEN' });
    return null;
  };

  await page.route('**/api/session', (r) => r.fulfill({ json: member }));
  await page.route('**/api/me/navigation', (r) =>
    r.fulfill({
      json: {
        unreadConversationCount: 2,
        unreadNotificationCount: 3,
        newRequestCount: 3,
        ownsListing: true,
        isVerifier: false,
        verificationCount: 0,
      },
    }),
  );

  await page.route(/\/api\/my-business\/products(\/.*)?$/, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const [id, what] = new URL(request.url()).pathname.split('/').slice(4);

    if (method === 'GET') {
      const refused = listFailure(fake.products, 'JB-PRD-503');
      return route.fulfill(refused ?? { json: products() });
    }
    if (what === 'position') {
      const body = request.postDataJSON() as { position: number };
      fake.moves.push({ id, position: body.position });
      if (fake.move === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      const row = fake.productRows.find((item) => item.id === id)!;
      fake.productRows.splice(fake.productRows.indexOf(row), 1);
      fake.productRows.splice(body.position - 1, 0, row);
      return route.fulfill({ json: products() });
    }
    if (method === 'DELETE') {
      if (fake.remove === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      const row = fake.productRows.find((item) => item.id === id)!;
      fake.deleted.push(row.name);
      fake.productRows = fake.productRows.filter((item) => item.id !== id);
      return route.fulfill({ json: { id, name: row.name, pastRequests: row.requests } });
    }
    const body = request.postDataJSON() as {
      name: string;
      price: string;
      stock: number | null;
      description: string;
    };
    fake.productSaves.push(body);
    if (fake.save === 'hangs') return;
    if (fake.save === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.save === 'limit') {
      return route.fulfill(
        problem(409, { code: 'PRODUCT_LIMIT', detail: 'You can list up to 100 products.' }),
      );
    }
    if (method === 'PUT') {
      const row = fake.productRows.find((item) => item.id === id)!;
      Object.assign(row, {
        name: body.name,
        priceCents: cents(body.price),
        stock: body.stock,
        description: body.description || null,
      });
      return route.fulfill({ json: productView(row) });
    }
    next += 1;
    const created = product(next, body.name, cents(body.price), {
      stock: body.stock,
      description: body.description || null,
    });
    fake.productRows.push(created);
    return route.fulfill({ status: 201, json: productView(created) });
  });

  await page.route(/\/api\/my-business\/services(\/.*)?$/, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const [id, what] = new URL(request.url()).pathname.split('/').slice(4);

    if (method === 'GET') {
      const refused = listFailure(fake.services, 'JB-SVC-503');
      return route.fulfill(refused ?? { json: services() });
    }
    if (what === 'position') {
      const body = request.postDataJSON() as { position: number };
      fake.moves.push({ id, position: body.position });
      if (fake.move === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      const row = fake.serviceRows.find((item) => item.id === id)!;
      fake.serviceRows.splice(fake.serviceRows.indexOf(row), 1);
      fake.serviceRows.splice(body.position - 1, 0, row);
      return route.fulfill({ json: services() });
    }
    if (method === 'DELETE') {
      if (fake.remove === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
      const row = fake.serviceRows.find((item) => item.id === id)!;
      fake.deleted.push(row.name);
      fake.serviceRows = fake.serviceRows.filter((item) => item.id !== id);
      return route.fulfill({ json: { id, name: row.name, pastRequests: 0 } });
    }
    const body = request.postDataJSON() as {
      name: string;
      detail: string;
      pricing: 'free' | 'amount' | 'ask';
      price: string;
      action: 'book' | 'ask';
      durationMinutes: number | null;
      offersVideo: boolean;
      offersInPerson: boolean;
      place: string;
    };
    fake.serviceSaves.push(body);
    if (fake.save === 'hangs') return;
    if (fake.save === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    next += 1;
    const row: FakeService = {
      id: method === 'PUT' ? id : `b2000000-0000-4000-8000-0000000000${next}`,
      name: body.name,
      detail: body.detail,
      priceKind: body.pricing,
      priceCents: body.pricing === 'amount' ? cents(body.price) : null,
      action: body.action,
      durationMinutes: body.durationMinutes,
      offersVideo: body.offersVideo,
      offersInPerson: body.offersInPerson,
      inPersonPlace: body.place || null,
    };
    if (method === 'PUT') {
      fake.serviceRows[fake.serviceRows.findIndex((item) => item.id === id)] = row;
      return route.fulfill({ json: row });
    }
    fake.serviceRows.push(row);
    return route.fulfill({ status: 201, json: row });
  });

  return fake;
}
