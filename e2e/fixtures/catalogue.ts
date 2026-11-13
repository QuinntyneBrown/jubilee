import type { Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { naomi } from './incoming-requests';

// A stand-in for the owner's products and services (L2-089 to L2-095) and for the session of an
// owner. What the app sends is kept so a test can prove it (ADR 0009).

export type CatalogueOutcome = 'ok' | 'fails' | 'forbidden';

/** A product photo as the upload answers it (L2-091 AC9). */
export interface FakeProductPhoto {
  id: string;
  key: string;
  width: number;
  height: number;
}

interface FakeOption {
  label: string;
  stock: number | null;
}

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
  optionName: string | null;
  options: FakeOption[];
  photo: FakeProductPhoto | null;
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

/** When meetings can be booked (L2-220), as the API gives it. */
export interface FakeMeetingHours {
  days: number[];
  opensAt: string;
  closesAt: string;
  slotMinutes: number;
  meetsOn: string;
  ownerSet: boolean;
}

/** What an owner who never saved hours is shown (L2-220 AC1). */
export const SUGGESTED_HOURS: FakeMeetingHours = {
  days: [1, 2, 3, 4, 5],
  opensAt: '09:00',
  closesAt: '17:00',
  slotMinutes: 30,
  meetsOn: 'Monday to Friday',
  ownerSet: false,
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Monday to Friday", "Tuesday, Thursday and Saturday": the days in words, as the API says them. */
export function meetsOn(days: number[]): string {
  const week = [1, 2, 3, 4, 5, 6, 0].filter((day) => days.includes(day));
  const names = week.map((day) => WEEKDAYS[day]);
  const run = week.length > 2 && week.every((day, i) => i === 0 || (week[i - 1] + 1) % 7 === day);
  if (run) return `${names[0]} to ${names.at(-1)}`;
  return names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

export interface FakeCatalogue {
  /** `fails` answers the list with a 503; `forbidden` with a 403. */
  products: CatalogueOutcome;
  services: CatalogueOutcome;
  /** `fails` answers the save with a 500, `hangs` never answers, `limit` refuses it with a 409. */
  save: 'ok' | 'fails' | 'hangs' | 'limit';
  /**
   * Uploading a product photo: `hangs` never answers, `infected` is refused with 422 `FAILED_SCAN`,
   * `unavailable` with 503 `SCAN_UNAVAILABLE`, `not-an-image` with 422 `NOT_AN_IMAGE`.
   */
  upload: 'ok' | 'hangs' | 'infected' | 'unavailable' | 'not-an-image';
  /** The photos the app uploaded, in order. */
  uploads: FakeProductPhoto[];
  remove: 'ok' | 'fails';
  move: 'ok' | 'fails';
  /** Saving meeting hours: `fails` answers 500, `hangs` never answers, `refused` answers 422 on "Until". */
  hours: 'ok' | 'fails' | 'hangs' | 'refused';
  meetingHours: FakeMeetingHours;
  hoursSaves: Record<string, unknown>[];
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
  optionName: null,
  options: [],
  photo: null,
  ...extra,
});

/** The photo key the stub gives the n-th upload; `/media/{key}/…` is answered with the mocks' mug. */
export const photoKey = (n: number) => `${String(n).padStart(2, '0')}`.repeat(16);

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
    upload: 'ok',
    uploads: [],
    remove: 'ok',
    move: 'ok',
    hours: 'ok',
    meetingHours: structuredClone(SUGGESTED_HOURS),
    hoursSaves: [],
    productRows: structuredClone(PRODUCTS),
    serviceRows: structuredClone(SERVICES),
    productSaves: [],
    serviceSaves: [],
    deleted: [],
    moves: [],
    ...initial,
  };

  const soldOut = (row: FakeProduct) =>
    row.options.length > 0 ? row.options.every((option) => option.stock === 0) : row.stock === 0;

  const productView = (row: FakeProduct) => ({
    ...row,
    stock: row.options.length > 0 ? null : row.stock,
    soldOut: soldOut(row),
    tint: 'gold',
    icon: 'bag',
    stockChange: 'none',
  });

  const products = () => ({
    business: 'Luzandre.com',
    slug: 'luzandre-com',
    subtitle: 'Live since June 2026',
    live: true,
    total: fake.productRows.length,
    soldOut: fake.productRows.filter(soldOut).length,
    max: 100,
    rows: fake.productRows.map(productView),
  });

  const services = () => ({
    business: 'Luzandre.com',
    slug: 'luzandre-com',
    subtitle: 'Live since June 2026',
    live: true,
    total: fake.serviceRows.length,
    max: 50,
    rows: fake.serviceRows,
    meetingHours: fake.meetingHours,
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
        isModerator: false,
      },
    }),
  );

  // The product photos are the mocks' mug, whatever their key.
  await page.route('**/media/**', (route) => {
    if (/\.woff2?(\?|$)/.test(route.request().url())) return route.fallback();
    return route.fulfill({
      body: readFileSync(join(__dirname, '..', '..', 'docs', 'assets', 'photos', 'mug.jpg')),
      contentType: 'image/jpeg',
    });
  });

  await page.route(/\/api\/my-business\/products(\/.*)?$/, async (route: Route) => {
    const request = route.request();
    const method = request.method();
    const [id, what] = new URL(request.url()).pathname.split('/').slice(4);

    if (id === 'photos' && method === 'POST') {
      if (fake.upload === 'hangs') return;
      if (fake.upload === 'infected') {
        return route.fulfill(problem(422, { code: 'FAILED_SCAN' }));
      }
      if (fake.upload === 'not-an-image') {
        return route.fulfill(problem(422, { code: 'NOT_AN_IMAGE' }));
      }
      if (fake.upload === 'unavailable') {
        return route.fulfill(problem(503, { code: 'SCAN_UNAVAILABLE' }));
      }
      const n = fake.uploads.length + 1;
      const photo = {
        id: `c3000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`,
        key: photoKey(n),
        width: 1200,
        height: 1200,
      };
      fake.uploads.push(photo);
      return route.fulfill({ status: 201, json: photo });
    }
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
      minimumQuantity?: number | null;
      optionName?: string | null;
      options?: FakeOption[] | null;
      photoId?: string | null;
    };
    fake.productSaves.push(body);
    const known = [...fake.uploads, ...fake.productRows.map((row) => row.photo)];
    const saved = {
      minimumQuantity: body.minimumQuantity ?? 1,
      optionName: body.options?.length ? (body.optionName ?? 'Option') : null,
      options: body.options ?? [],
      photo: known.find((photo) => photo && photo.id === body.photoId) ?? null,
    };
    if (fake.save === 'hangs') return;
    if (fake.save === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.save === 'limit') {
      return route.fulfill(
        problem(409, { code: 'PRODUCT_LIMIT', detail: 'You can list up to 100 products.' }),
      );
    }
    // What the save did to the stock, as the API says it (L2-036 AC3).
    const stockChange = (before: number | null, after: number | null) =>
      before !== 0 && after === 0
        ? 'became-sold-out'
        : before === 0 && after !== 0
          ? 'back-in-stock'
          : 'none';
    if (method === 'PUT') {
      const row = fake.productRows.find((item) => item.id === id)!;
      const change = stockChange(row.stock, body.stock);
      Object.assign(row, {
        name: body.name,
        priceCents: cents(body.price),
        stock: body.stock,
        description: body.description || null,
        ...saved,
      });
      return route.fulfill({ json: { ...productView(row), stockChange: change } });
    }
    next += 1;
    const created = product(next, body.name, cents(body.price), {
      stock: body.stock,
      description: body.description || null,
      ...saved,
    });
    fake.productRows.push(created);
    return route.fulfill({
      status: 201,
      json: { ...productView(created), stockChange: stockChange(null, created.stock) },
    });
  });

  await page.route('**/api/my-business/meeting-hours', (route: Route) => {
    const body = route.request().postDataJSON() as Omit<FakeMeetingHours, 'meetsOn' | 'ownerSet'>;
    fake.hoursSaves.push(body);
    if (fake.hours === 'hangs') return;
    if (fake.hours === 'fails') return route.fulfill(problem(500, { code: 'SERVER_ERROR' }));
    if (fake.hours === 'refused') {
      return route.fulfill(
        problem(422, { code: 'validation_failed', errors: { closesAt: 'BEFORE_OPENS' } }),
      );
    }
    fake.meetingHours = { ...body, meetsOn: meetsOn(body.days), ownerSet: true };
    return route.fulfill({ json: fake.meetingHours });
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
