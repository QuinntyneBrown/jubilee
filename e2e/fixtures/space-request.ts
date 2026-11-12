import type { Page, Route } from '@playwright/test';

// A stand-in for the space request endpoint (L2-205). The requests the app makes are kept so a
// test can prove what it sent, and that it sent no price (ADR 0009).

export type SpaceRequestDelivery = 'ok' | 'fail' | 'invalid' | 'already';

export interface FakeSpaceRequest {
  delivery: SpaceRequestDelivery;
  /** The field codes a 422 answer carries. */
  errors: Record<string, string>;
  sends: Record<string, unknown>[];
}

const problem = (status: number, body: object) => ({
  status,
  contentType: 'application/problem+json',
  body: JSON.stringify({ title: 'Problem', status, correlationId: 'e2e', ...body }),
});

export async function stubSpaceRequest(
  page: Page,
  initial: Partial<FakeSpaceRequest> = {},
): Promise<FakeSpaceRequest> {
  const fake: FakeSpaceRequest = { delivery: 'ok', errors: {}, sends: [], ...initial };

  await page.route('**/api/requests/spaces', (route: Route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    fake.sends.push(body);
    switch (fake.delivery) {
      case 'fail':
        return route.abort('failed');
      case 'invalid':
        return route.fulfill(problem(422, { code: 'validation_failed', errors: fake.errors }));
      case 'already':
        return route.fulfill(problem(409, { code: 'ALREADY_REQUESTED' }));
      default:
        return route.fulfill({
          status: 201,
          json: { id: 'r-space', status: 'new', memberStatus: 'Awaiting reply' },
        });
    }
  });

  return fake;
}
