/**
 * Every screen state the suite opens, keyed once so one spec serves both targets:
 * the Angular app (`app` path plus the scenario that produces the state) and the
 * design reference (`mock` file under docs/mocks, opened when JB_BASELINE=1).
 */
export type Who = 'visitor' | 'member';

/** Names a data stub in `fixtures/stubs.ts`; absent means the recorded answers of the seeded API (ADR 0009). */
export type StubName =
  | 'browse-loading'
  | 'browse-empty'
  | 'browse-error'
  | 'browse-edge'
  | 'category-loading'
  | 'category-empty'
  | 'category-error'
  | 'category-long'
  | 'category-not-found'
  | 'business-loading'
  | 'business-error'
  | 'business-empty'
  | 'business-edge'
  | 'business-owner'
  | 'shop-loading'
  | 'shop-error'
  | 'shop-empty'
  | 'product-loading'
  | 'product-error'
  | 'product-sold-out'
  | 'product-alert-requested'
  | 'search-loading'
  | 'search-error'
  | 'search-no-results'
  | 'search-start'
  | 'verify-email-pending'
  | 'verify-email-loading'
  | 'verify-email-success'
  | 'verify-email-expired'
  | 'verify-email-error'
  | 'email-unconfirmed'
  | 'email-bounced'
  | 'messages'
  | 'messages-empty'
  | 'messages-loading'
  | 'messages-error'
  | 'conversation'
  | 'conversation-loading'
  | 'conversation-error';

export interface ScreenRoute {
  app: string;
  mock: string;
  who: Who;
  stub?: StubName;
  /**
   * Opens this path first and follows its link to `app`, for a state that depends on what the
   * app learnt from the list it was opened from.
   */
  via?: string;
}

export const routes = {
  'sign-up': { app: '/join', mock: 'pages/sign-up/default.html', who: 'visitor' },
  'join-agreement': {
    app: '/join/agreement',
    mock: 'pages/join-agreement/default.html',
    who: 'member',
  },
  'verify-email': {
    app: '/verify-email',
    mock: 'pages/verify-email/default.html',
    who: 'member',
    stub: 'verify-email-pending',
  },
  'verify-email.loading': {
    app: '/verify-email/e2e-token',
    mock: 'pages/verify-email/loading.html',
    who: 'visitor',
    stub: 'verify-email-loading',
  },
  'verify-email.success': {
    app: '/verify-email/e2e-token',
    mock: 'pages/verify-email/success.html',
    who: 'visitor',
    stub: 'verify-email-success',
  },
  'verify-email.expired': {
    app: '/verify-email/e2e-token',
    mock: 'pages/verify-email/expired.html',
    who: 'visitor',
    stub: 'verify-email-expired',
  },
  'verify-email.error': {
    app: '/verify-email/e2e-token',
    mock: 'pages/verify-email/error.html',
    who: 'visitor',
    stub: 'verify-email-error',
  },
  'verify-email-banner': {
    app: '/',
    mock: 'notifications/verify-email-banner/persistent.html',
    who: 'member',
    stub: 'email-unconfirmed',
  },
  'verify-email-banner.danger': {
    app: '/',
    mock: 'notifications/verify-email-banner/danger.html',
    who: 'member',
    stub: 'email-bounced',
  },
  messages: {
    app: '/messages',
    mock: 'pages/messages/default.html',
    who: 'member',
    stub: 'messages',
  },
  'messages.empty': {
    app: '/messages',
    mock: 'pages/messages/empty.html',
    who: 'member',
    stub: 'messages-empty',
  },
  'messages.loading': {
    app: '/messages',
    mock: 'pages/messages/loading.html',
    who: 'member',
    stub: 'messages-loading',
  },
  'messages.error': {
    app: '/messages',
    mock: 'pages/messages/error.html',
    who: 'member',
    stub: 'messages-error',
  },
  conversation: {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/default.html',
    who: 'member',
    stub: 'conversation',
  },
  'conversation.loading': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/loading.html',
    who: 'member',
    stub: 'conversation-loading',
  },
  'conversation.error': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/error.html',
    who: 'member',
    stub: 'conversation-error',
  },
  'new-message': {
    app: '/b/legacy-financial/message',
    mock: 'dialogs/new-message/default.html',
    who: 'member',
  },
  welcome: { app: '/welcome', mock: 'pages/welcome/default.html', who: 'visitor' },
  browse: { app: '/', mock: 'pages/browse/default.html', who: 'member' },
  'browse.signed-out': { app: '/', mock: 'pages/browse/signed-out.html', who: 'visitor' },
  'browse.loading': {
    app: '/',
    mock: 'pages/browse/loading.html',
    who: 'member',
    stub: 'browse-loading',
  },
  'browse.empty': {
    app: '/',
    mock: 'pages/browse/empty.html',
    who: 'member',
    stub: 'browse-empty',
  },
  'browse.error': {
    app: '/',
    mock: 'pages/browse/error.html',
    who: 'member',
    stub: 'browse-error',
  },
  'browse.edge': { app: '/', mock: 'pages/browse/edge.html', who: 'member', stub: 'browse-edge' },
  category: { app: '/c/home-property', mock: 'pages/category/default.html', who: 'member' },
  'category.loading': {
    app: '/c/home-property',
    mock: 'pages/category/loading.html',
    who: 'member',
    stub: 'category-loading',
  },
  'category.empty': {
    app: '/c/home-property',
    mock: 'pages/category/empty.html',
    who: 'member',
    stub: 'category-empty',
  },
  'category.error': {
    app: '/c/home-property',
    mock: 'pages/category/error.html',
    who: 'member',
    stub: 'category-error',
  },
  'category.no-results': {
    app: '/c/home-property?offers=emergency-calls,open-saturdays&areas=scarborough',
    mock: 'pages/category/no-results.html',
    who: 'member',
  },
  'category.long': {
    app: '/c/home-property',
    mock: 'pages/category/long.html',
    who: 'member',
    stub: 'category-long',
  },
  filters: {
    app: '/c/home-property?offers=free-quote&areas=east-york',
    mock: 'dialogs/filters/default.html',
    who: 'member',
  },
  business: {
    app: '/b/legacy-financial',
    mock: 'pages/business/default.html',
    who: 'member',
  },
  'business.loading': {
    app: '/b/legacy-financial',
    mock: 'pages/business/loading.html',
    who: 'member',
    stub: 'business-loading',
  },
  'business.error': {
    app: '/b/legacy-financial',
    mock: 'pages/business/error.html',
    who: 'member',
    stub: 'business-error',
  },
  'business.empty': {
    app: '/b/legacy-financial',
    mock: 'pages/business/empty.html',
    who: 'member',
    stub: 'business-empty',
  },
  'business.edge': {
    app: '/b/legacy-financial',
    mock: 'pages/business/edge.html',
    who: 'member',
    stub: 'business-edge',
  },
  'business.owner': {
    app: '/b/legacy-financial',
    mock: 'pages/business/owner.html',
    who: 'member',
    stub: 'business-owner',
  },
  shop: { app: '/b/luzandre', mock: 'pages/shop/default.html', who: 'member' },
  'shop.loading': {
    app: '/b/luzandre',
    mock: 'pages/shop/loading.html',
    who: 'member',
    stub: 'shop-loading',
    via: '/c/shops',
  },
  'shop.error': {
    app: '/b/luzandre',
    mock: 'pages/shop/error.html',
    who: 'member',
    stub: 'shop-error',
    via: '/c/shops',
  },
  'shop.empty': {
    app: '/b/luzandre',
    mock: 'pages/shop/empty.html',
    who: 'member',
    stub: 'shop-empty',
  },
  product: {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
    mock: 'pages/product/default.html',
    who: 'member',
  },
  'product.invalid': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
    mock: 'pages/product/invalid.html',
    who: 'member',
  },
  'product.loading': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
    mock: 'pages/product/loading.html',
    who: 'member',
    stub: 'product-loading',
    via: '/b/luzandre',
  },
  'product.error': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
    mock: 'pages/product/error.html',
    who: 'member',
    stub: 'product-error',
    via: '/b/luzandre',
  },
  'product.sold-out': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
    mock: 'pages/product/sold-out.html',
    who: 'member',
    stub: 'product-sold-out',
  },
  'product.alert-requested': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal',
    mock: 'pages/product/alert-requested.html',
    who: 'member',
    stub: 'product-alert-requested',
  },
  search: { app: '/search?q=plumber', mock: 'pages/search/default.html', who: 'member' },
  'search.loading': {
    app: '/search?q=plumber',
    mock: 'pages/search/loading.html',
    who: 'member',
    stub: 'search-loading',
  },
  'search.empty': {
    app: '/search',
    mock: 'pages/search/empty.html',
    who: 'member',
    stub: 'search-start',
  },
  'search.error': {
    app: '/search?q=plumber',
    mock: 'pages/search/error.html',
    who: 'member',
    stub: 'search-error',
  },
  'search.no-results': {
    app: '/search?q=plumbre',
    mock: 'pages/search/no-results.html',
    who: 'member',
    stub: 'search-no-results',
  },
  'not-found': { app: '/no-such-page', mock: 'pages/not-found/default.html', who: 'member' },
} as const satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
