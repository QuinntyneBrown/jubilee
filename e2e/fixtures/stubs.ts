import type { Page, Route } from '@playwright/test';
import { categories } from './categories';
import { browseHomeFromMock, categoryPageFromMock } from './mock-data';
import type { StubName } from './routes';

const home = '**/api/directory/home';
const categoryListings = '**/api/categories/*/listings?*';

/** The ProblemDetails the API sends when a directory read cannot be served (L2-118). */
function unavailable(reference: string) {
  return {
    status: 503,
    contentType: 'application/problem+json',
    body: JSON.stringify({
      title: 'Service unavailable',
      status: 503,
      reference,
      correlationId: 'e2e-correlation-id',
    }),
  };
}

/** Answers the browse home request with the given directory. */
export function stubBrowseHome(page: Page, directory: unknown): Promise<unknown> {
  return page.route(home, (route) => route.fulfill({ json: directory }));
}

/** A request that is still on its way when the test looks at the screen. */
function pending(route: Route): Promise<void> {
  return new Promise(() => void route);
}

/** Installs the API answers that put a screen in a state the seeded data cannot produce. */
export async function applyStub(page: Page, name: StubName): Promise<unknown> {
  switch (name) {
    case 'browse-loading':
      return page.route(home, pending);
    case 'browse-empty':
      return page.route(home, (route) =>
        route.fulfill({
          json: { liveBusinessCount: 0, categories, featured: [], products: [], groups: [] },
        }),
      );
    case 'browse-error':
      return page.route(home, (route) => route.fulfill(unavailable('JB-DIR-503')));
    case 'browse-edge':
      return page.route(home, (route) => route.fulfill({ json: browseHomeFromMock('edge') }));
    case 'category-loading':
      return page.route(categoryListings, pending);
    case 'category-empty':
      return page.route(categoryListings, (route) =>
        route.fulfill({
          json: {
            category: { slug: 'home-property', name: 'Home & property' },
            totalCount: 0,
            matchCount: 0,
            fact: null,
            filters: { offers: [], areas: [] },
            sort: 'recommended',
            page: 1,
            pageSize: 16,
            pageCount: 1,
            businesses: [],
            suggestions: [],
          },
        }),
      );
    case 'category-error':
      return page.route(categoryListings, (route) => route.fulfill(unavailable('JB-CAT-503')));
    case 'category-long':
      return page.route(categoryListings, (route) =>
        route.fulfill({ json: categoryPageFromMock('long') }),
      );
    case 'category-not-found':
      return page.route(categoryListings, (route) =>
        route.fulfill({
          status: 404,
          contentType: 'application/problem+json',
          body: JSON.stringify({ title: 'Not found', status: 404, code: 'category_not_found' }),
        }),
      );
  }
}
