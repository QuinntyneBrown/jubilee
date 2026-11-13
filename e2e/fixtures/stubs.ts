import type { Page, Route } from '@playwright/test';
import { categories } from './categories';
import { browseHomeFromMock, categoryPageFromMock, listingFromMock } from './mock-data';
import { fulfil, recordedAnswer } from './mock-api';
import { legacyMessages, ownerRows, photoMessages, requestCards, stubMessaging } from './messaging';
import { stubAccountData } from './account-data';
import { SPACE_LISTING, stubAdmin } from './admin';
import { daniel, stubStaff } from './staff';
import { stubModeration } from './moderation';
import { confirmedRows, stubIncoming } from './incoming-requests';
import { stubCatalogue } from './catalogue';
import { stubProfile } from './profile';
import { BROWSE_SAVED, stubSaved } from './saved';
import { stubFeedback } from './feedback';
import { stubPasswordReset } from './password-reset';
import { BACK_IN_STOCK, NOTIFICATIONS, stubNotifications } from './notifications';
import { stubUnsubscribe } from './unsubscribe';
import { LISTING_PHOTOS, stubListingMedia } from './photos';
import { OTHER_BUSINESSES, SUITE, stubMyBusiness } from './my-business';
import { DRAIN, stubMemberRequests } from './member-requests';
import { stubListingDrafts } from './listing-drafts';
import { stubOrder } from './order';
import { stubQuote } from './quote';
import type { StubName } from './routes';
import { STATEMENT_LAPSED, naomiOwing, stubStatementAgreement } from './statement-of-faith';
import { joannaSession, keepDraft, stubSession as stubSignedInSession } from './session';

const home = '**/api/directory/home';
const categoryListings = '**/api/categories/*/listings?*';
const legacyFinancial = '**/api/listings/legacy-financial';
const luzandre = '**/api/listings/luzandre';
const roncesvalles = '**/api/listings/roncesvalles-guest-suite';
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

/** One result of a search: a business, or a service or a product of `businessName`. */
export function searchHit(
  kind: 'business' | 'service' | 'product',
  name: string,
  slug: string,
  businessName = name,
  where = 'name',
) {
  const term = name.split(' ')[0].toLowerCase();
  return {
    kind,
    name,
    slug,
    productSlug: kind === 'product' ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : null,
    businessName,
    categorySlug: 'home-property',
    explanation: {
      text: `Matches ${term} in ${where}`,
      highlights: [{ start: 'Matches '.length, length: term.length }],
    },
  };
}

/** A search answer with these hits, counted by kind as the API counts them. */
export function searchResultsOf(query: string, hits: ReturnType<typeof searchHit>[]) {
  const count = (kind: string) => hits.filter((hit) => hit.kind === kind).length;
  return {
    query,
    businessCount: count('business'),
    serviceCount: count('service'),
    productCount: count('product'),
    hasMatchExplanations: true,
    hits,
    suggestion: null,
  };
}

/** A space as search returns it (L2-204): its card, never its address. */
function spaceHit(space: {
  slug: string;
  name: string;
  term: string;
  rent: number;
  facts: string[];
  neighbourhood: string;
  available: string;
}) {
  return {
    kind: 'business',
    name: space.name,
    slug: space.slug,
    productSlug: null,
    businessName: space.name,
    categorySlug: 'rooms-rentals',
    explanation: null,
    space: { ...space, per: 'month', coverPhoto: null },
  };
}

/** "room" finds the room in Leslieville and the roommate in East York, as the mock shows (L2-204). */
export const spaceResults = (
  others: unknown[] = [],
): { query: string; businessCount: number; hits: unknown[] } & Record<string, unknown> => ({
  query: 'room',
  businessCount: 2 + others.length,
  serviceCount: 0,
  productCount: 0,
  hasMatchExplanations: false,
  hits: [
    spaceHit({
      slug: 'furnished-room-leslieville',
      name: 'Furnished room in a family home, Leslieville',
      term: 'room',
      rent: 950,
      facts: ['Double bed', 'Shared bath'],
      neighbourhood: 'Leslieville',
      available: 'Now',
    }),
    spaceHit({
      slug: 'roommate-east-york',
      name: 'Roommate wanted: 3-bedroom house in East York',
      term: 'roommate',
      rent: 1100,
      facts: ['Unfurnished room', 'Shared bath (2)'],
      neighbourhood: 'East York',
      available: 'Jan 1',
    }),
    ...others,
  ],
  suggestion: null,
});

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

/** Removes the answers of `stubSearch`, so a search is answered from the recording again. */
export function unstubSearch(page: Page): Promise<void> {
  return page.unroute(searchResults);
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
    case 'messages-more':
      // The mock draws four of the 64 conversations, with "Show more conversations" under them.
      return stubMessaging(page, { inboxTotal: 64 });
    case 'messages-owner':
      return stubMessaging(page, { rows: ownerRows() });
    case 'conversation':
      return stubMessaging(page);
    case 'conversation-away':
      // Back on Thursday 12 November, two days after the mocks' today.
      return stubMessaging(page, { awayUntil: '2026-11-12T05:00:00Z' });
    case 'conversation-loading':
      return stubMessaging(page, { conversation: 'loading' });
    case 'conversation-error':
      return stubMessaging(page, { conversation: 'error' });
    case 'conversation-photo':
      return stubMessaging(page, { messages: [...legacyMessages(), ...photoMessages()] });
    case 'conversation-photo-sending':
      return stubMessaging(page, { uploading: 'hang' });
    case 'conversation-arrived': {
      // The reply of the mock, as it stands once it has arrived over the event stream.
      const fake = await stubMessaging(page);
      fake.arrive('I’ve sent the meeting link to your e-mail.');
      return fake;
    }
    case 'conversation-requests':
      return stubMessaging(page, { requests: requestCards() });
    case 'conversation-muted':
      return stubMessaging(page, { muted: true });
    case 'browse-loading':
      return page.route(home, pending);
    case 'browse-empty':
      return page.route(home, (route) =>
        route.fulfill({
          json: {
            liveBusinessCount: 0,
            categories,
            featured: [],
            products: [],
            groups: [],
            rooms: { count: 0, spaces: [] },
          },
        }),
      );
    case 'browse-error':
      return page.route(home, (route) => route.fulfill(unavailable('JB-DIR-503')));
    case 'browse-edge':
      return page.route(home, (route) => route.fulfill({ json: browseHomeFromMock('edge') }));
    case 'browse-rooms-empty':
      // No roommate is listed: the shelf has four spaces and nothing for "Roommates".
      return page.route(home, async (route) => {
        const answer = await recordedAnswer(route);
        const body = answer.body as { rooms: { count: number; spaces: { term: string }[] } };
        const spaces = body.rooms.spaces.filter((space) => space.term !== 'roommate');
        await fulfil(route, { ...answer, body: { ...body, rooms: { count: 4, spaces } } });
      });
    case 'rooms-empty':
      return page.route(categoryListings, (route) =>
        route.fulfill({
          json: {
            category: { slug: 'rooms-rentals', name: 'Rooms & rentals' },
            totalCount: 4,
            matchCount: 0,
            fact: null,
            filters: { offers: [], areas: [] },
            sort: 'newest',
            page: 1,
            pageSize: 16,
            pageCount: 1,
            businesses: [],
            suggestions: [],
            term: 'roommate',
            spaces: [],
          },
        }),
      );
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
            spaces: [],
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
    case 'space-loading':
      return page.route(roncesvalles, pending);
    case 'space-error':
      return page.route(roncesvalles, (route) => route.fulfill(unavailable('JB-BIZ-503')));
    case 'space-requested':
      // The member has an open request for the suite (L2-206 AC9).
      return patchListing(page, roncesvalles, (listing) => ({
        ...listing,
        openRequestId: 'r-space',
      }));
    case 'business-loading':
      return page.route(legacyFinancial, pending);
    case 'business-retrying':
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
    case 'business-photos':
      // The seeded businesses have no photos: uploads are files, and the recording holds none (L2-221).
      await stubListingMedia(page);
      return patchListing(page, legacyFinancial, (listing) => ({
        ...listing,
        photos: LISTING_PHOTOS.map(({ file: _file, ...photo }) => photo),
      }));
    case 'business-replies-fast':
      // The seeded businesses have answered nobody yet; the badge comes from a month of quick answers (L2-054).
      return patchListing(page, legacyFinancial, (listing) => ({
        ...listing,
        repliesFast: true,
        related: (listing['related'] as Record<string, unknown>[]).map((card) =>
          card['slug'] === 'deeks-insurance' ? { ...card, repliesFast: true } : card,
        ),
      }));
    case 'business-preview':
      // The owner's preview of a listing that is not public (L2-219).
      return patchListing(page, legacyFinancial, (listing) => ({
        ...listing,
        viewerRelation: 'owner',
        stage: 'draft',
        status: 'draft',
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
    case 'shop-sold-out':
      // The seeded mug is in stock; the sold-out card comes from its owner's later edits.
      return patchListing(page, luzandre, (listing) => ({
        ...listing,
        products: (listing['products'] as { slug: string }[]).map((product) =>
          product.slug === 'gold-cross-stoneware-mug' ? { ...product, soldOut: true } : product,
        ),
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
    case 'search-spaces':
      return stubSearch(page, spaceResults());
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
    case 'request-detail-unanswered': {
      const fake = await stubMemberRequests(page);
      fake.requests.find((request) => request.id === DRAIN)!.unanswered = true;
      return fake;
    }
    case 'incoming':
      return stubIncoming(page);
    case 'incoming-empty':
      return stubIncoming(page, { list: 'empty' });
    case 'incoming-error':
      return stubIncoming(page, { list: 'fails' });
    case 'incoming-confirmed': {
      const fake = await stubIncoming(page);
      fake.rows.push(...confirmedRows());
      return fake;
    }
    case 'business':
      return stubMyBusiness(page);
    case 'business-away':
      return stubMyBusiness(page, { awayUntil: '2026-11-16T05:00:00Z' });
    case 'business-switcher':
      return stubMyBusiness(page, { others: OTHER_BUSINESSES });
    case 'business-empty':
      return stubMyBusiness(page, { state: 'none' });
    case 'business-retrying':
      return stubMyBusiness(page, { overview: 'fails' });
    case 'business-paused':
      return stubMyBusiness(page, { paused: true });
    case 'business-statement-due':
      await stubStatementAgreement(page);
      return stubMyBusiness(page, {}, naomiOwing());
    case 'business-statement-pending':
      await stubStatementAgreement(page, 'pending');
      return stubMyBusiness(page, {}, naomiOwing());
    case 'business-statement-failing':
      await stubStatementAgreement(page, 'fails');
      return stubMyBusiness(page, {}, naomiOwing());
    case 'business-statement-lapsed':
      await stubStatementAgreement(page);
      return stubMyBusiness(page, { paused: true }, naomiOwing(STATEMENT_LAPSED));
    case 'listing-draft':
      return stubListingDrafts(page);
    case 'order':
      return stubOrder(page);
    case 'quote':
      // The mock shows the phone of the member's profile already filled in (L2-045 AC7).
      return stubQuote(page, { phone: '416-555-0142' });
    case 'editor':
      return stubMyBusiness(page);
    case 'editor-photos':
      return stubMyBusiness(page, {
        photos: [
          {
            id: '9e1d0000-0000-4000-8000-000000000001',
            key: '1'.repeat(32),
            position: 1,
            alt: '',
            customAlt: null,
            width: 800,
            height: 600,
          },
          {
            id: '9e1d0000-0000-4000-8000-000000000002',
            key: '2'.repeat(32),
            position: 2,
            alt: '',
            customAlt: 'Gold cross mug on a shelf',
            width: 800,
            height: 600,
          },
        ],
      });
    case 'editor-space':
      return stubMyBusiness(page, { listing: SUITE });
    case 'editor-error':
      return stubMyBusiness(page, { editor: 'fails' });
    case 'profile':
      return void (await stubProfile(page));
    case 'message-draft-restored':
      await stubSignedInSession(page, { signedIn: true });
      await keepDraft(page, {
        email: joannaSession.email,
        address: '/b/legacy-financial/message',
        key: 'message',
        values: {
          message: 'Hello Trevor, do you help newcomers set up RESPs for their children?',
        },
      });
      return stubMessaging(page);
    case 'profile-this-device-only':
      await stubSignedInSession(page, { signedIn: true, otherSessionCount: 0 });
      return void (await stubProfile(page));
    case 'profile-other-devices':
      await stubSignedInSession(page, { signedIn: true, otherSessionCount: 1 });
      return void (await stubProfile(page));
    case 'profile-other-devices-pending':
      await stubSignedInSession(page, {
        signedIn: true,
        otherSessionCount: 1,
        endOthers: 'pending',
      });
      return void (await stubProfile(page));
    case 'profile-other-devices-failing':
      await stubSignedInSession(page, { signedIn: true, otherSessionCount: 1, endOthers: 'fails' });
      return void (await stubProfile(page));
    case 'profile-error':
      return void (await stubProfile(page, { load: 'fails' }));
    case 'preferences-error':
      return void (await stubProfile(page, { preferencesLoad: 'fails' }));
    case 'confirm-email-change':
      return void (await stubProfile(page, { confirm: 'confirmed' }));
    case 'confirm-email-change-expired':
      return void (await stubProfile(page, { confirm: 'expired' }));
    case 'confirm-email-change-in-use':
      return void (await stubProfile(page, { confirm: 'email-in-use' }));
    case 'unsubscribe':
      return void (await stubUnsubscribe(page, 'messages'));
    case 'unsubscribe-summary':
      return void (await stubUnsubscribe(page, 'summary'));
    case 'unsubscribe-invalid':
      return void (await stubUnsubscribe(page, 'invalid'));
    case 'unsubscribe-error':
      return void (await stubUnsubscribe(page, 'fails'));
    case 'unsubscribe-loading':
      return void (await stubUnsubscribe(page, 'pending'));
    case 'feedback':
      return void (await stubFeedback(page));
    case 'feedback-empty':
      return void (await stubFeedback(page, { history: [] }));
    case 'feedback-loading':
      return void (await stubFeedback(page, { history: 'loading' }));
    case 'feedback-error':
      return void (await stubFeedback(page, { history: 'error' }));
    case 'feedback-no-business':
      return void (await stubFeedback(page, { businesses: [] }));
    case 'feedback-check-in':
      // The listing is submitted, then the question is answered.
      await stubListingDrafts(page);
      return void (await stubFeedback(page));
    case 'saved':
      return void (await stubSaved(page));
    case 'browse-saved-hearts':
      // Saves are never answered, so a pressed heart stays busy (L2-041 AC8).
      return void (await stubSaved(page, { items: BROWSE_SAVED, save: 'pending' }));
    case 'saved-empty':
      return void (await stubSaved(page, { items: [] }));
    case 'saved-error':
      return void (await stubSaved(page, { list: 'fails' }));
    case 'password-reset':
    case 'reset-password':
      return void (await stubPasswordReset(page));
    case 'password-reset-rate-limited':
      return void (await stubPasswordReset(page, { request: 'rate-limited' }));
    case 'reset-password-expired':
      return void (await stubPasswordReset(page, { link: 'expired' }));
    case 'reset-password-error':
      return void (await stubPasswordReset(page, { link: 'fails' }));
    case 'notifications':
      return void (await stubNotifications(page));
    case 'notifications-read':
      return void (await stubNotifications(page, {
        items: NOTIFICATIONS.map((item) => ({ ...item, read: true })),
      }));
    case 'notifications-empty':
      return void (await stubNotifications(page, { items: [] }));
    case 'notifications-error':
      return void (await stubNotifications(page, { list: 'fails' }));
    case 'notifications-back-in-stock':
      return void (await stubNotifications(page, { items: [BACK_IN_STOCK, ...NOTIFICATIONS] }));
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
    case 'services-hours-pending':
      return stubCatalogue(page, { hours: 'hangs' });
    case 'services-hours-failing':
      return stubCatalogue(page, { hours: 'fails' });
    case 'admin-listings':
      return stubAdmin(page);
    case 'admin-listings-empty':
      return stubAdmin(page, { listings: 'empty' });
    case 'admin-listings-error':
      return stubAdmin(page, { listings: 'fails' });
    case 'admin-listing':
      return stubAdmin(page);
    case 'admin-listing-taken-down':
      return stubAdmin(page, {
        takenDown: {
          at: '2026-11-10T14:05:00-05:00',
          byName: 'Miriam Castillo',
          reason:
            'The web address in the listing’s name leads to a different company’s store, so members could not tell who they were buying from. You’re welcome to list again with your own shop’s address.',
        },
      });
    case 'admin-listing-space':
      return stubAdmin(page, { fields: SPACE_LISTING });
    case 'admin-listing-error':
      return stubAdmin(page, { listing: 'fails' });
    case 'moderation-reports':
    case 'moderation-report':
    case 'moderation-featured':
      return stubModeration(page);
    case 'moderation-reports-empty':
      return stubModeration(page, { reports: 'empty' });
    case 'moderation-reports-error':
      return stubModeration(page, { reports: 'fails' });
    case 'moderation-report-conversation':
      return stubModeration(page);
    case 'moderation-report-error':
      return stubModeration(page, { reports: 'fails' });
    case 'moderation-featured-error':
      return stubModeration(page, { featured: 'fails' });
    case 'account-data-requested':
      await stubProfile(page);
      return stubAccountData(page, { exportState: 'requested' });
    case 'data-download-done':
      return stubAccountData(page);
    case 'data-download-unavailable':
      return stubAccountData(page, { download: 'unavailable' });
    case 'staff-signed-out':
      return stubStaff(page, 'signed-out');
    case 'staff-network-refused':
      return stubStaff(page, 'network-refused');
    case 'staff-admin-only':
      return stubAdmin(page, {}, daniel);
    case 'google-sign-in-off':
      return stubSession(page, visitorWithoutGoogle);
    case 'sign-in-failing':
      return stubSent(page, '**/api/session', failed);
    case 'sign-in-pending':
      return stubSent(page, '**/api/session', pending);
    case 'launch-notify-pending':
      return stubSent(page, '**/api/launch/notifications', pending);
    case 'launch-notify-failing':
      return stubSent(page, '**/api/launch/notifications', failed);
    case 'launch-notify-recovering':
      return stubSent(page, '**/api/launch/notifications', failedOnce());
    case 'launch-notify-limited':
      return stubSent(page, '**/api/launch/notifications', limited);
    case 'launch-notify-challenge':
      return stubSent(page, '**/api/launch/notifications', challengeFailed);
    case 'launch-notify-refused-field':
      return stubSent(page, '**/api/launch/notifications', refused({ email: 'EMAIL_INVALID' }));
    case 'launch-notify-unreachable':
      return stubSent(page, '**/api/launch/notifications', (route) => route.abort('failed'));
    case 'launch-business-refused-fields':
      return stubSent(
        page,
        '**/api/launch/businesses',
        refused({ category: 'CATEGORY_UNKNOWN', website: 'WEBSITE_INVALID' }),
      );
    case 'launch-business-unreachable':
      return stubSent(page, '**/api/launch/businesses', (route) => route.abort('failed'));
    case 'launch-business-pending':
      return stubSent(page, '**/api/launch/businesses', pending);
    case 'launch-business-failing':
      return stubSent(page, '**/api/launch/businesses', failed);
    case 'launch-business-recovering':
      return stubSent(page, '**/api/launch/businesses', failedOnce());
    case 'launch-business-limited':
      return stubSent(page, '**/api/launch/businesses', limited);
    case 'launch-business-challenge':
      return stubSent(page, '**/api/launch/businesses', challengeFailed);
    case 'join-created':
      return stubSent(page, '**/api/account/join', (route) =>
        route.fulfill({ status: 201, json: { email: 'joanna.adeyemi@example.com' } }),
      );
    case 'join-failing':
      return stubSent(page, '**/api/account/join', failed);
    case 'join-pending':
      return stubSent(page, '**/api/account/join', pending);
    case 'verify-email-pending':
      return stubSession(page, unconfirmedSession);
    case 'verify-email-loading':
      return page.route(confirmation, pending);
    case 'verify-email-success':
      return stubConfirmation(page, { outcome: 'confirmed', firstName: 'Joanna' });
    case 'verify-email-success-return':
      // The browser remembers where the visitor was going when they were asked to join (L2-012 AC5).
      await page.addInitScript(() => {
        localStorage.setItem(
          'jubilee-return-after-join',
          JSON.stringify({ path: '/b/legacy-financial', at: Date.now() }),
        );
      });
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

/** A visitor where Google sign-in is not configured: the pages show no Google button (L2-003 AC5). */
export const visitorWithoutGoogle = { signedIn: false, googleSignIn: false };

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
/** Answers a form that is sent to `url`; what the page reads from the same address is left alone. */
function stubSent(
  page: Page,
  url: string,
  answer: (route: Route) => Promise<void>,
): Promise<unknown> {
  return page.route(url, (route) =>
    route.request().method() === 'POST' ? answer(route) : route.fallback(),
  );
}

/**
 * The request failed on the server. Not a 502, 503 or 504: those also raise the banner that says
 * Jubilee cannot be reached, which the error state of a form does not show on its own.
 */
function failed(route: Route): Promise<void> {
  return route.fulfill({
    status: 500,
    contentType: 'application/problem+json',
    body: JSON.stringify({ title: 'Something went wrong', status: 500, reference: 'JB-AUTH-503' }),
  });
}

/** The first send fails on the way; the next one, which the form sends by itself, is accepted. */
function failedOnce(): (route: Route) => Promise<void> {
  let sends = 0;
  return (route) => (++sends === 1 ? failed(route) : route.fulfill({ status: 202, body: '' }));
}

/** Too many from one address: 42 minutes to wait, as the mocks show (L2-137 AC1). */
function limited(route: Route): Promise<void> {
  return route.fulfill({
    status: 429,
    headers: { 'Retry-After': '2520' },
    contentType: 'application/problem+json',
    body: JSON.stringify({ title: 'You’re doing that a lot.', status: 429, code: 'rate_limited' }),
  });
}

/** The server refuses fields the page let through, with a code for each (ADR 0012). */
function refused(errors: Record<string, string>): (route: Route) => Promise<void> {
  return (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        title: 'Fix the highlighted fields.',
        status: 422,
        code: 'validation_failed',
        errors,
      }),
    });
}

/** The bot challenge was not passed (L2-137 AC2). */
function challengeFailed(route: Route): Promise<void> {
  return route.fulfill({
    status: 422,
    contentType: 'application/problem+json',
    body: JSON.stringify({
      title: 'Fix the highlighted fields.',
      status: 422,
      code: 'validation_failed',
      errors: { challenge: 'CHALLENGE_FAILED' },
    }),
  });
}

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

/** What the change of an unconfirmed address is answered with (L2-004 AC5, AC9, AC10). */
export type UnconfirmedEmailChange =
  'replaced' | 'in-use' | 'limited' | 'invalid' | 'fail' | 'hang';

/**
 * Answers "Use another e-mail" and keeps the bodies it was sent. The API answers 204 whether or not
 * the address was free (L2-141 AC1); only `replaced` changes the address the session then reports.
 */
export async function stubUnconfirmedEmailChange(
  page: Page,
  outcome: UnconfirmedEmailChange = 'replaced',
): Promise<Record<string, unknown>[]> {
  const seen: Record<string, unknown>[] = [];
  await page.route('**/api/account/unconfirmed-email', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    seen.push(body);
    switch (outcome) {
      case 'replaced':
        await stubSession(page, { ...unconfirmedSession, email: String(body['email']) });
        return route.fulfill({ status: 204 });
      case 'in-use':
        return route.fulfill({ status: 204 });
      case 'limited':
        return limited(route);
      case 'invalid':
        return route.fulfill({
          status: 422,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            title: 'Fix the highlighted fields.',
            status: 422,
            code: 'validation_failed',
            errors: { email: 'EMAIL_INVALID' },
          }),
        });
      case 'fail':
        return failed(route);
      case 'hang':
        return;
    }
  });
  return seen;
}

/** Answers "Send it again" (the resend of the confirmation link). */
export function stubResend(page: Page, status = 202): Promise<unknown> {
  return page.route('**/api/account/confirmation/resend', (route) => route.fulfill({ status }));
}

/** Answers "Send it again" past the hourly limit: 429 with 42 minutes to wait (L2-005 AC5). */
export function stubResendLimited(page: Page): Promise<unknown> {
  return page.route('**/api/account/confirmation/resend', limited);
}
