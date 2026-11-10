import type { Page, Route } from '@playwright/test';
import { categories } from './categories';
import { browseHomeFromMock, categoryPageFromMock, listingFromMock } from './mock-data';
import type { StubName } from './routes';

const home = '**/api/directory/home';
const categoryListings = '**/api/categories/*/listings?*';
const legacyFinancial = '**/api/listings/legacy-financial';
const luzandre = '**/api/listings/luzandre';
const tee = '**/api/listings/luzandre/products/faith-heavyweight-tee-charcoal';

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

/**
 * Answers a listing request with the real, seeded answer changed by `patch`, so a state differs
 * from the seed only in what the state is about.
 */
export function patchListing(
  page: Page,
  url: string,
  patch: (listing: Record<string, unknown>) => Record<string, unknown>,
): Promise<unknown> {
  return page.route(url, async (route) => {
    const response = await route.fetch();
    const listing = (await response.json()) as Record<string, unknown>;
    await route.fulfill({ response, json: patch(listing) });
  });
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
    case 'business-loading':
      return page.route(legacyFinancial, pending);
    case 'business-error':
      return page.route(legacyFinancial, (route) => route.fulfill(unavailable('JB-BIZ-503')));
    case 'business-empty':
      return patchListing(page, legacyFinancial, (listing) => ({
        ...listing,
        highlight: null,
        services: [],
      }));
    case 'business-edge':
      return patchListing(page, legacyFinancial, (listing) => ({
        ...listing,
        ...listingFromMock('edge'),
      }));
    case 'shop-loading':
      return page.route(luzandre, pending);
    case 'shop-error':
      return page.route(luzandre, (route) => route.fulfill(unavailable('JB-BIZ-503')));
    case 'shop-empty':
      return patchListing(page, luzandre, (listing) => ({
        ...listing,
        products: [],
        productCount: 0,
      }));
    case 'product-loading':
      return page.route(tee, pending);
    case 'product-error':
      return page.route(tee, (route) => route.fulfill(unavailable('JB-PRD-503')));
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
