import type { Page, Route } from '@playwright/test';

// Stand-ins for the reviews endpoints (L2-238, ADR 0066). The recording is made as a visitor, so
// what a member, the owner or an author sees, and every write, is answered here (ADR 0009). The
// reviews are the seeded ones (DemoReviews), with the ids the tests name them by.

export type ReviewWriting = 'sign-in' | 'eligible' | 'not-eligible' | 'written' | 'owner';
export type ReviewViewer = 'visitor' | 'member' | 'owner';

export interface FakeReply {
  from: string;
  text: string;
  at: string;
  editedAt: string | null;
}

export interface FakeReview {
  id: string;
  author: string;
  initials: string;
  rating: number;
  itemId: string | null;
  itemName: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  mine: boolean;
  reply: FakeReply | null;
}

const at = (month: number, day: number) =>
  `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T17:00:00+00:00`;

function review(
  id: string,
  author: string,
  rating: number,
  itemName: string,
  createdAt: string,
  text: string,
  reply: FakeReply | null = null,
): FakeReview {
  const initials = author
    .split(' ')
    .map((part) => part[0])
    .join('');
  return {
    id,
    author,
    initials,
    rating,
    itemId: null,
    itemName,
    text,
    createdAt,
    editedAt: null,
    mine: false,
    reply,
  };
}

/** Legacy Financial's five reviews, newest first, as the API answers them. */
export function legacyReviews(): FakeReview[] {
  return [
    review(
      'rv-grace',
      'Grace A.',
      5,
      'Estate & legacy plan',
      at(11, 3),
      'Trevor helped my husband and me write wills and a giving plan after our second child. He never pushed a product, prayed with us at the end of the first meeting, and the written plan was clear enough that our parents understood it too.',
      {
        from: 'Trevor Chew',
        text: 'Thank you, Grace. It was a joy to work with you both. See you at the six-month check-in.',
        at: at(11, 4),
        editedAt: null,
      },
    ),
    review(
      'rv-marcus',
      'Marcus T.',
      5,
      'Discovery meeting',
      at(10, 20),
      'Booked the free meeting expecting a sales pitch. Got an honest look at our debt and a plan to be clear of it in three years. We went back for the RRSP review.',
    ),
    review(
      'rv-esther',
      'Esther L.',
      4,
      'Retirement & RRSP review',
      at(9, 8),
      'Very knowledgeable and patient with my questions. Scheduling took longer than I hoped in tax season, so book early.',
      {
        from: 'Trevor Chew',
        text: 'Fair point, Esther. We’ve added evening slots from February to April this year.',
        at: at(9, 9),
        editedAt: null,
      },
    ),
    review(
      'rv-priya',
      'Priya S.',
      4,
      'Discovery meeting',
      at(8, 2),
      'Helpful first meeting and no pressure, but the follow-up notes took two weeks to arrive and I had to ask for them twice.',
    ),
    review(
      'rv-paul',
      'Paul K.',
      5,
      'Life & disability insurance review',
      at(6, 15),
      'Found we were paying for two overlapping policies. Saved us $64 a month.',
    ),
  ];
}

/** Joanna's own review of Legacy Financial (pages/business/reviews-mine). */
export function joannasReview(): FakeReview {
  return {
    ...review(
      'rv-joanna',
      'Joanna A.',
      5,
      'Discovery meeting',
      at(11, 10),
      'Trevor took the time to understand what we needed before suggesting anything. Clear, honest and no pressure. We’d go back.',
    ),
    itemId: 'svc-discovery',
    mine: true,
  };
}

/** Luzandre.com's five reviews, newest first (pages/business/reviews-owner). */
export function luzandreReviews(): FakeReview[] {
  const from = 'Luzandre.com';
  return [
    review(
      'rv-tamara',
      'Tamara J.',
      5,
      'Custom church team tee (min. 12)',
      at(11, 5),
      'Ordered 40 tees for our youth retreat. The proof came back the same day, the print is thick and hasn’t cracked after a dozen washes. The kids actually wear them outside church.',
      {
        from,
        text: 'Thank you Tamara! Send us a photo from the retreat, we’d love to share it.',
        at: at(11, 6),
        editedAt: null,
      },
    ),
    review(
      'rv-ruth',
      'Ruth M.',
      5,
      'Gold cross stoneware mug',
      at(10, 12),
      'Heavier than I expected in a good way. The gold has stayed bright in the dishwasher.',
    ),
    review(
      'rv-samuel',
      'Samuel P.',
      4,
      'Gold cross stoneware mug',
      at(9, 30),
      'Good mug, solid glaze. It took nine days to ship to Scarborough, longer than the five I was told.',
    ),
    ...teeReviews(),
    review(
      'rv-david',
      'David C.',
      5,
      'Gold cross stoneware mug',
      at(7, 22),
      'Bought two as gifts for our small group leaders. Both arrived well packed and they use them every Sunday.',
    ),
  ];
}

/** Deeks Insurance's form: one service, so no choice (pages/write-review/single-item). */
export function deeksForm(): ReturnType<typeof legacyForm> {
  return {
    listing: {
      slug: 'deeks-insurance',
      name: 'Deeks Insurance',
      kind: 'services',
      categoryName: 'Financial & insurance',
      categorySlug: 'financial-insurance',
      ownerName: null,
    },
    items: [],
    itemLegend: null,
    authorName: 'Joanna A.',
  };
}

/** The tee's one review, by Kofi (pages/product/default). */
export function teeReviews(): FakeReview[] {
  return [
    review(
      'rv-kofi',
      'Kofi B.',
      3,
      'Faith heavyweight tee, charcoal',
      at(8, 14),
      'Love the design. Runs a full size small, so order up. Exchange was easy but took about two weeks by mail.',
      {
        from: 'Luzandre.com',
        text: 'Thanks Kofi. We’ve added a fit note and a size chart to every tee.',
        at: at(8, 15),
        editedAt: null,
      },
    ),
  ];
}

export interface ReviewsOptions {
  /** The reviews of the listing (or of the product, when `product` is set). */
  items?: FakeReview[];
  viewer?: ReviewViewer;
  writing?: ReviewWriting;
  /** `loading` never answers; `error` answers 503 until `failures` runs out (then the reviews). */
  mode?: 'ok' | 'loading' | 'error';
  failures?: number;
  /** The write that fails: `offline` 503, `limited` 429, `invalid` 422. */
  writeMode?: 'ok' | 'offline' | 'limited' | 'invalid';
}

export interface FakeReviews {
  items: FakeReview[];
  viewer: ReviewViewer;
  writing: ReviewWriting;
  mode: 'ok' | 'loading' | 'error';
  failures: number;
  writeMode: 'ok' | 'offline' | 'limited' | 'invalid';
  /** How many times the reviews were read. */
  reads: number;
  /** Each write as the app sent it: method, path, body and Idempotency-Key. */
  writes: { method: string; path: string; body: Record<string, unknown> | null; key?: string }[];
}

function summaryOf(items: FakeReview[]) {
  const breakdown = [5, 4, 3, 2, 1].map((s) => items.filter((r) => r.rating === s).length);
  const total = items.reduce((sum, r) => sum + r.rating, 0);
  const average = items.length ? Math.round((total / items.length) * 10) / 10 : 0;
  return { average, count: items.length, breakdown };
}

function problem(route: Route, status: number, body: object = {}): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/problem+json',
    headers: status === 429 ? { 'Retry-After': '1200' } : {},
    body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
  });
}

/**
 * Answers `GET /api/listings/{slug}/reviews` (and `?product=`) with `options`, and every write of
 * reviews as the API would, keeping what was sent so a test can prove it.
 */
export async function stubReviews(
  page: Page,
  slug: string,
  options: ReviewsOptions = {},
): Promise<FakeReviews> {
  const fake: FakeReviews = {
    items: options.items ?? legacyReviews(),
    viewer: options.viewer ?? 'member',
    writing: options.writing ?? 'eligible',
    mode: options.mode ?? 'ok',
    failures: options.failures ?? (options.mode === 'error' ? Number.MAX_SAFE_INTEGER : 0),
    writeMode: options.writeMode ?? 'ok',
    reads: 0,
    writes: [],
  };
  await page.route(`**/api/listings/${slug}/reviews`, (route) => read(route));
  await page.route(`**/api/listings/${slug}/reviews?*`, (route) => read(route));
  await page.route('**/api/reviews/**', (route) => change(route));

  function read(route: Route): Promise<void> {
    if (route.request().method() !== 'GET') return route.fallback();
    fake.reads++;
    if (fake.mode === 'loading') return new Promise(() => void route);
    if (fake.failures > 0) {
      fake.failures--;
      return problem(route, 503, { reference: 'JB-REV-503' });
    }
    return route.fulfill({
      json: {
        summary: summaryOf(fake.items),
        viewer: fake.viewer,
        writing: fake.writing,
        items: fake.items,
      },
    });
  }

  function change(route: Route): Promise<void> {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const body = (request.postDataJSON() ?? null) as Record<string, unknown> | null;
    fake.writes.push({
      method: request.method(),
      path,
      body,
      key: request.headers()['idempotency-key'],
    });
    if (fake.writeMode === 'offline') return problem(route, 503, { reference: 'JB-REV-503' });
    if (fake.writeMode === 'limited') return problem(route, 429, { code: 'RATE_LIMITED' });
    const [, , , id, what] = path.split('/');
    const index = fake.items.findIndex((r) => r.id === id);
    if (index < 0) return problem(route, 404);
    const now = '2026-11-12T15:00:00+00:00';
    if (what === 'reports') return route.fulfill({ status: 201, json: { id: 'report-1' } });
    if (what === 'reply') {
      const before = fake.items[index];
      const reply: FakeReply = before.reply
        ? { ...before.reply, text: String(body?.['text'] ?? ''), editedAt: now }
        : { from: 'Trevor Chew', text: String(body?.['text'] ?? ''), at: now, editedAt: null };
      fake.items[index] = { ...before, reply };
      return route.fulfill({ json: fake.items[index] });
    }
    if (request.method() === 'DELETE') {
      fake.items.splice(index, 1);
      fake.writing = 'eligible';
      return route.fulfill({ status: 204 });
    }
    fake.items[index] = {
      ...fake.items[index],
      rating: Number(body?.['rating']),
      text: String(body?.['text'] ?? ''),
      editedAt: now,
    };
    return route.fulfill({ json: fake.items[index] });
  }

  return fake;
}

/** What the Write a review screen of Legacy Financial needs (L2-238 AC2). */
export function legacyForm() {
  return {
    listing: {
      slug: 'legacy-financial',
      name: 'Legacy Financial',
      kind: 'services',
      categoryName: 'Financial & insurance',
      categorySlug: 'financial-insurance',
      ownerName: 'Trevor Chew, CKA®, CFP®, CLU®' as string | null,
    },
    items: [
      { id: 'svc-discovery', name: 'Discovery meeting' },
      { id: 'svc-retirement', name: 'Retirement & RRSP review' },
      { id: 'svc-insurance', name: 'Life & disability insurance review' },
      { id: 'svc-estate', name: 'Estate & legacy plan' },
    ],
    itemLegend: 'service' as 'service' | 'product' | null,
    authorName: 'Joanna A.',
  };
}

/** The guest suite's form: a space shows no choice (L2-227 AC3). */
export function suiteForm(): ReturnType<typeof legacyForm> {
  return {
    listing: {
      slug: 'roncesvalles-guest-suite',
      name: 'Guest suite near Roncesvalles',
      kind: 'space',
      categoryName: 'Rooms & rentals',
      categorySlug: 'rooms-rentals',
      ownerName: 'Paul & Marta Kowalski',
    },
    items: [],
    itemLegend: null,
    authorName: 'Joanna A.',
  };
}

export interface FormOptions {
  /** The form; `refusal` answers `GET …/reviews/new` with a refusal instead. */
  form?: ReturnType<typeof legacyForm>;
  refusal?: { status: number; code: string };
  /** How the post answers: `offline` 503, `limited` 429, `invalid` 422, `hang` never. */
  postMode?: 'ok' | 'offline' | 'limited' | 'invalid' | 'hang';
}

export interface FakeReviewForm {
  postMode: NonNullable<FormOptions['postMode']>;
  posts: { body: Record<string, unknown>; key?: string }[];
}

/** Answers the Write a review screen's form and its post (L2-227, L2-228). */
export async function stubReviewForm(
  page: Page,
  slug: string,
  options: FormOptions = {},
): Promise<FakeReviewForm> {
  const fake: FakeReviewForm = { postMode: options.postMode ?? 'ok', posts: [] };
  const form = options.form ?? legacyForm();
  await page.route(`**/api/listings/${slug}/reviews/new`, (route) =>
    options.refusal
      ? problem(route, options.refusal.status, { code: options.refusal.code })
      : route.fulfill({ json: form }),
  );
  await page.route(`**/api/listings/${slug}/reviews`, (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    fake.posts.push({ body, key: request.headers()['idempotency-key'] });
    switch (fake.postMode) {
      case 'hang':
        return new Promise(() => void route);
      case 'offline':
        return problem(route, 503, { reference: 'JB-REV-503' });
      case 'limited':
        return problem(route, 429, { code: 'rate_limited' });
      case 'invalid':
        return problem(route, 422, { errors: { itemId: 'ITEM_UNKNOWN' } });
      default: {
        const item = form.items.find((i) => i.id === body['itemId']);
        const created: FakeReview = {
          id: 'rv-new',
          author: form.authorName,
          initials: 'JA',
          rating: Number(body['rating']),
          itemId: (body['itemId'] as string | null) ?? null,
          itemName: item?.name ?? (form.listing.kind === 'space' ? 'My stay' : 'Their service'),
          text: String(body['text']).trim(),
          createdAt: '2026-11-12T15:00:00+00:00',
          editedAt: null,
          mine: true,
          reply: null,
        };
        return route.fulfill({ status: 201, json: created });
      }
    }
  });
  return fake;
}
