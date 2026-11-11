import type { Page, Route } from '@playwright/test';

// A stand-in for the listing-draft endpoints (L2-071 to L2-079). The requests the app makes are
// kept so a test can prove what it sent (ADR 0009).

export interface FakeDraftBody {
  kind: 'products' | 'services';
  name: string;
  tagline: string;
  categorySlug: string | null;
  highlight: string | null;
  place: string | null;
  church: string;
  pastorEmail: string;
  agreed: boolean;
  items: {
    name: string;
    detail: string | null;
    priceKind: 'free' | 'amount' | 'ask';
    priceCents: number | null;
  }[];
  idempotencyKey: string | null;
}

export interface FakeDraft extends FakeDraftBody {
  id: string;
  updatedAt: string;
}

export type DraftOutcome = 'ok' | 'load-fails' | 'invalid' | 'limit' | 'hang';

export interface FakeListingDrafts {
  /** The draft the member left earlier, or null for a first visit. */
  draft: FakeDraft | null;
  outcome: DraftOutcome;
  creates: FakeDraftBody[];
  saves: FakeDraftBody[];
  submits: FakeDraftBody[];
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
    submits: [],
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
    // POST /{id}/submit
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
        return route.fulfill(
          problem(422, { code: 'validation_failed', errors: { pastorEmail: 'OWN_EMAIL' } }),
        );
      default:
        fake.submits.push(body);
        return route.fulfill({
          status: 201,
          json: {
            listingId: 'l-1',
            slug: 'luzandre-com',
            name: body.name,
            kind: body.kind,
            stage: 'pending-reference',
            church: body.church,
            pastorEmail: body.pastorEmail,
            submittedAt: '2026-11-10T14:40:00Z',
          },
        });
    }
  });

  return fake;
}
