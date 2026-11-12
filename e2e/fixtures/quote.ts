import type { Page, Route } from '@playwright/test';

// A stand-in for the quote endpoints (L2-045). The requests the app makes are kept so a test can
// prove what it sent (ADR 0009).

export type QuoteDelivery = 'ok' | 'fail' | 'hang' | 'unconfirmed' | 'invalid';

export interface FakeQuote {
  delivery: QuoteDelivery;
  usuallyReplies: string | null;
  /** The phone of the member's profile, as the options carry it (L2-045 AC7). */
  phone: string | null;
  /** Every write to the account the app made: a request never changes the profile. */
  accountWrites: string[];
  sends: {
    listingSlug: string;
    serviceId: string | null;
    description: string;
    neededBy: string | null;
    budget: string | null;
    phone: string | null;
    idempotencyKey: string;
  }[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubQuote(page: Page, initial: Partial<FakeQuote> = {}): Promise<FakeQuote> {
  const fake: FakeQuote = {
    delivery: 'ok',
    usuallyReplies: 'within a few hours',
    phone: null,
    accountWrites: [],
    sends: [],
    ...initial,
  };

  await page.route('**/api/listings/luzandre/quote', (route) =>
    route.fulfill({
      json: {
        business: { name: 'Luzandre.com', slug: 'luzandre' },
        ownerFirstName: 'Naomi',
        usuallyReplies: fake.usuallyReplies,
        phone: fake.phone,
      },
    }),
  );

  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/account') && request.method() !== 'GET') {
      fake.accountWrites.push(`${request.method()} ${path}`);
    }
  });

  await page.route('**/api/requests/quotes', (route: Route) => {
    const body = route.request().postDataJSON() as FakeQuote['sends'][number];
    switch (fake.delivery) {
      case 'hang':
        return new Promise<void>(() => void route);
      case 'fail':
        return route.abort('failed');
      case 'unconfirmed':
        return route.fulfill(problem(403, { code: 'EMAIL_UNCONFIRMED' }));
      case 'invalid':
        return route.fulfill(
          problem(422, {
            code: 'validation_failed',
            errors: { phone: 'INVALID_PHONE', neededBy: 'IN_THE_PAST' },
          }),
        );
      default:
        fake.sends.push(body);
        return route.fulfill({
          status: 201,
          json: { id: 'r-quote', status: 'new', memberStatus: 'Awaiting reply' },
        });
    }
  });

  return fake;
}
