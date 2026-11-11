import type { Page, Route } from '@playwright/test';
import { categories } from './categories';
import { browseHomeFromMock, categoryPageFromMock, listingFromMock } from './mock-data';
import { fulfil, recordedAnswer } from './mock-api';
import { stubMessaging } from './messaging';
import { esther, stubAdmin } from './admin';
import { stubIncoming } from './incoming-requests';
import { stubCatalogue } from './catalogue';
import { stubMyBusiness } from './my-business';
import { DRAIN, stubMemberRequests } from './member-requests';
import { stubReference } from './reference';
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

const searchResults = '**/api/search?*';
const searchStart = '**/api/search/start';

/** A search answer that differs from the seed: no hits, so the page shows its no-results state. */
export function noResults(
  query: string,
  suggestion: { closeTerm: string; categorySlug: string } | null,
) {
  return {
    query,
    businessCount: 0,
    serviceCount: 0,
    productCount: 0,
    hasMatchExplanations: true,
    hits: [],
    suggestion,
  };
}

/** The empty search page of a member with a history, as the mocks show it. */
export const memberSearchStart = {
  recent: ['plumber', 'family lawyer', 'journaling Bible', 'wedding flowers'].map((query, i) => ({
    id: `00000000-0000-0000-0000-00000000000${i + 1}`,
    query,
  })),
  popularCategories: [
    ['shops', 'Shops'],
    ['financial-insurance', 'Financial & insurance'],
    ['legal-immigration', 'Legal & immigration'],
    ['home-property', 'Home & property'],
    ['real-estate-living', 'Real estate & living'],
    ['health-family', 'Health & family'],
  ].map(([slug, name]) => ({ slug, name, count: 5 })),
};

/** Answers every search with `body` (and `status`), whatever the query. */
export function stubSearch(page: Page, body: unknown, status = 200): Promise<unknown> {
  return page.route(searchResults, (route) =>
    route.fulfill(
      status === 200
        ? { json: body }
        : { status, contentType: 'application/problem+json', body: JSON.stringify(body) },
    ),
  );
}

/** Answers the empty search page and the removal of recent searches. */
export async function stubSearchStart(page: Page, start: unknown): Promise<unknown> {
  await page.route('**/api/search/recent**', (route) => route.fulfill({ status: 204 }));
  return page.route(searchStart, (route) => route.fulfill({ json: start }));
}

/** A request that is still on its way when the test looks at the screen. */
function pending(route: Route): Promise<void> {
  return new Promise(() => void route);
}

/**
 * Answers a listing request with the recorded answer (ADR 0009) changed by `patch`, so a state differs
 * from the seed only in what the state is about.
 */
export function patchListing(
  page: Page,
  url: string,
  patch: (listing: Record<string, unknown>) => Record<string, unknown>,
): Promise<unknown> {
  return page.route(url, async (route) => {
    const answer = await recordedAnswer(route);
    await fulfil(route, { ...answer, body: patch(answer.body as Record<string, unknown>) });
  });
}

/** Installs the API answers that put a screen in a state the seeded data cannot produce. */
export async function applyStub(page: Page, name: StubName): Promise<unknown> {
  switch (name) {
    case 'messages':
      return stubMessaging(page);
    case 'messages-empty':
      return stubMessaging(page, { inbox: 'empty' });
    case 'messages-loading':
      return stubMessaging(page, { inbox: 'loading' });
    case 'messages-error':
      return stubMessaging(page, { inbox: 'error' });
    case 'conversation':
      return stubMessaging(page);
    case 'conversation-loading':
      return stubMessaging(page, { conversation: 'loading' });
    case 'conversation-error':
      return stubMessaging(page, { conversation: 'error' });
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
    case 'business-owner':
      // The demo member is not Legacy Financial's owner; the server decides the relation.
      return patchListing(page, legacyFinancial, (listing) => ({
        ...listing,
        viewerRelation: 'owner',
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
    case 'product-sold-out':
    case 'product-alert-requested':
      // The seeded tee is in stock; the sold-out state comes from its owner's later edits.
      await page.route('**/api/products/*/stock-alert', (route) => route.fulfill({ status: 204 }));
      return patchListing(page, tee, (product) => ({
        ...product,
        soldOut: true,
        maxQuantity: 0,
        options: (product['options'] as { label: string }[]).map(({ label }) => ({
          label,
          maxQuantity: 0,
        })),
        restockNote: 'Naomi prints the next batch on Mon 23 Nov.',
        stockAlertRequested: name === 'product-alert-requested',
      }));
    case 'search-loading':
      return page.route(searchResults, pending);
    case 'search-error':
      return page.route(searchResults, (route) => route.fulfill(unavailable('JB-SRCH-503')));
    case 'search-no-results':
      return stubSearch(
        page,
        noResults('plumbre', { closeTerm: 'plumber', categorySlug: 'home-property' }),
      );
    case 'search-start':
      return stubSearchStart(page, memberSearchStart);
    case 'member-requests':
      return stubMemberRequests(page);
    case 'member-requests-empty':
      return stubMemberRequests(page, { requests: [] });
    case 'member-requests-error':
      return stubMemberRequests(page, { list: 'fails' });
    case 'request-detail':
    case 'request-detail-confirmed':
      return stubMemberRequests(page);
    case 'request-detail-declined': {
      const fake = await stubMemberRequests(page);
      fake.requests.find((r) => r.id === DRAIN)!.declineMessage =
        'We’re booked solid until December and don’t want to keep you waiting.';
      fake.answer(DRAIN, 'declined');
      return fake;
    }
    case 'request-detail-cancelled': {
      const fake = await stubMemberRequests(page);
      fake.answer(DRAIN, 'cancelled');
      return fake;
    }
    case 'request-detail-error':
      return stubMemberRequests(page, { detail: 'fails' });
    case 'incoming':
      return stubIncoming(page);
    case 'incoming-empty':
      return stubIncoming(page, { list: 'empty' });
    case 'incoming-error':
      return stubIncoming(page, { list: 'fails' });
    case 'business':
      return stubMyBusiness(page);
    case 'business-pending':
      return stubMyBusiness(page, { state: 'pending-reference' });
    case 'business-changes':
      return stubMyBusiness(page, { state: 'changes-requested' });
    case 'business-empty':
      return stubMyBusiness(page, { state: 'none' });
    case 'business-error':
      return stubMyBusiness(page, { overview: 'fails' });
    case 'business-paused':
      return stubMyBusiness(page, { paused: true });
    case 'editor':
      return stubMyBusiness(page);
    case 'editor-error':
      return stubMyBusiness(page, { editor: 'fails' });
    case 'products':
      return stubCatalogue(page);
    case 'products-empty':
      return stubCatalogue(page, { productRows: [] });
    case 'products-error':
      return stubCatalogue(page, { products: 'fails' });
    case 'services':
      return stubCatalogue(page);
    case 'services-empty':
      return stubCatalogue(page, { serviceRows: [] });
    case 'services-error':
      return stubCatalogue(page, { services: 'fails' });
    case 'admin-queue':
      return stubAdmin(page);
    case 'admin-queue-empty':
      return stubAdmin(page, { queue: 'empty' });
    case 'admin-queue-error':
      return stubAdmin(page, { queue: 'fails' });
    case 'admin-review':
      return stubAdmin(page);
    case 'admin-review-approved':
      return stubAdmin(page, { stage: 'live' });
    case 'admin-review-changes-requested':
      return stubAdmin(page, { stage: 'changes-requested' });
    case 'admin-review-error':
      return stubAdmin(page, { review: 'fails' });
    case 'forbidden':
      return stubAdmin(page, {}, { ...esther, isVerifier: false });
    case 'reference':
      return stubReference(page);
    case 'reference-loading':
      return stubReference(page, { outcome: 'hang' });
    case 'reference-error':
      return stubReference(page, { outcome: 'load-fails' });
    case 'reference-expired':
      return stubReference(page, { outcome: 'closed' });
    case 'verify-email-pending':
      return stubSession(page, unconfirmedSession);
    case 'verify-email-loading':
      return page.route(confirmation, pending);
    case 'verify-email-success':
      return stubConfirmation(page, { outcome: 'confirmed', firstName: 'Joanna' });
    case 'verify-email-expired':
      return stubConfirmation(page, { outcome: 'expired', firstName: null });
    case 'verify-email-error':
      return stubConfirmation(
        page,
        { title: 'Service unavailable', status: 503, reference: 'JB-VERIFY-502' },
        503,
      );
    case 'email-unconfirmed':
      return stubSession(page, unconfirmedSession);
    case 'email-bounced':
      return stubSession(page, { ...unconfirmedSession, emailBounced: true });
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

/** Joanna as the session endpoint returns her while her address is not yet confirmed (L2-005). */
export const unconfirmedSession = {
  signedIn: true,
  firstName: 'Joanna',
  displayName: 'Joanna Adeyemi',
  initials: 'JA',
  email: 'joanna.adeyemi@example.com',
  emailStatus: 'unconfirmed',
  emailBounced: false,
  agreementRequired: false,
};

/** Answers the session with `session` over the member the visit signed in as. */
export function stubSession(page: Page, session: Record<string, unknown>): Promise<unknown> {
  return page.route('**/api/session', (route) => route.fulfill({ json: session }));
}

const confirmation = '**/api/account/confirmation';

/** Answers the opening of a confirmation link. */
export function stubConfirmation(page: Page, body: unknown, status = 200): Promise<unknown> {
  return page.route(confirmation, (route) =>
    route.fulfill({
      status,
      contentType: status >= 400 ? 'application/problem+json' : 'application/json',
      body: JSON.stringify(body),
    }),
  );
}

/** Answers "Send it again" (the resend of the confirmation link). */
export function stubResend(page: Page, status = 202): Promise<unknown> {
  return page.route('**/api/account/confirmation/resend', (route) => route.fulfill({ status }));
}
