import type { Page, Route } from '@playwright/test';

// A stand-in for the listing-draft endpoints (L2-071 to L2-079). The requests the app makes are
// kept so a test can prove what it sent (ADR 0009).

/** The rental fields of a space draft (L2-199). */
export interface FakeSpaceDraft {
  term: 'short-stay' | 'long-term' | 'room' | 'roommate';
  rent: number | null;
  available: string;
  minimumStay: number;
  neighbourhood: string;
  address: string;
  place: string;
  facts: string[];
  included: string[];
  household: string | null;
  rules: string[];
}

/** A product or a service of a draft, with what its editor asks (L2-073). */
export interface FakeDraftItem {
  name: string;
  detail: string | null;
  priceKind: 'free' | 'amount' | 'ask';
  priceCents: number | null;
  description?: string | null;
  stock?: number | null;
  action?: 'book' | 'ask';
  durationMinutes?: number | null;
  offersVideo?: boolean;
  offersInPerson?: boolean;
  inPersonPlace?: string | null;
}

export interface FakeDraftBody {
  kind: 'products' | 'services' | 'space';
  name: string;
  tagline: string;
  categorySlug: string | null;
  highlight: string | null;
  place: string | null;
  agreed: boolean;
  items: FakeDraftItem[];
  idempotencyKey: string | null;
  space?: FakeSpaceDraft | null;
}

export interface FakeDraft extends FakeDraftBody {
  id: string;
  updatedAt: string;
}

export type DraftOutcome = 'ok' | 'load-fails' | 'invalid' | 'limit' | 'hang';

/** The codes a 422 answer carries when the outcome is `invalid`. */
export type DraftErrors = Record<string, string>;

export interface FakeListingDrafts {
  /** The draft the member left earlier, or null for a first visit. */
  draft: FakeDraft | null;
  outcome: DraftOutcome;
  creates: FakeDraftBody[];
  saves: FakeDraftBody[];
  /** Every listing the app published (L2-078). */
  publishes: FakeDraftBody[];
  /** The field codes of an `invalid` answer. */
  errors: DraftErrors;
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubListingDrafts(
  page: Page,
  initial: Partial<FakeListingDrafts> = {},
): Promise<FakeListingDrafts> {
  const fake: FakeListingDrafts = {
    draft: null,
    outcome: 'ok',
    creates: [],
    saves: [],
    publishes: [],
    errors: { tagline: 'TOO_LONG:94' },
    ...initial,
  };
  const store = (id: string, body: FakeDraftBody): FakeDraft => ({
    ...body,
    id,
    updatedAt: '2026-11-10T14:36:00Z',
  });

  await page.route('**/api/listing-drafts**', (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/listing-drafts', '');
    const method = request.method();
    if (fake.outcome === 'load-fails' && method === 'GET') return route.abort('failed');
    if (method === 'GET' && path === '/current') {
      return fake.draft ? route.fulfill({ json: fake.draft }) : route.fulfill({ status: 204 });
    }
    if (method === 'GET') return route.fulfill({ json: fake.draft ?? {} });
    const body = request.postDataJSON() as FakeDraftBody;
    if (method === 'POST' && path === '') {
      fake.creates.push(body);
      fake.draft = store('d-1', body);
      return route.fulfill({ status: 201, json: fake.draft });
    }
    if (method === 'PUT') {
      fake.saves.push(body);
      fake.draft = store('d-1', body);
      return route.fulfill({ json: fake.draft });
    }
    // POST /{id}/publish (ADR 0057): anything else is not an endpoint
    if (!path.endsWith('/publish')) return route.fulfill({ status: 404 });
    switch (fake.outcome) {
      case 'hang':
        return new Promise<void>(() => void route);
      case 'limit':
        return route.fulfill(
          problem(409, {
            code: 'LISTING_LIMIT',
            detail: 'You can list up to 5 businesses. Write to help@jubilee.example for more.',
          }),
        );
      case 'invalid':
        return route.fulfill(problem(422, { code: 'validation_failed', errors: fake.errors }));
      default:
        fake.publishes.push(body);
        return route.fulfill({
          status: 201,
          json: {
            listingId: 'l-1',
            slug: 'luzandre-com',
            name: body.name,
            kind: body.kind,
            stage: 'live',
            submittedAt: '2026-11-10T14:40:00Z',
          },
        });
    }
  });

  return fake;
}
