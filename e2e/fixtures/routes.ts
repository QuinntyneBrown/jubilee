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
  | 'browse-rooms-empty'
  | 'space-loading'
  | 'space-error'
  | 'space-requested'
  | 'rooms-empty'
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
  | 'reference'
  | 'reference-loading'
  | 'reference-error'
  | 'reference-expired'
  | 'google-sign-in-off'
  | 'sign-in-failing'
  | 'sign-in-pending'
  | 'join-created'
  | 'join-failing'
  | 'join-pending'
  | 'verify-email-pending'
  | 'verify-email-loading'
  | 'verify-email-success'
  | 'verify-email-success-return'
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
  | 'conversation-error'
  | 'conversation-muted'
  | 'conversation-photo'
  | 'conversation-photo-sending'
  | 'conversation-arrived'
  | 'conversation-requests'
  | 'member-requests'
  | 'member-requests-empty'
  | 'member-requests-error'
  | 'request-detail'
  | 'request-detail-confirmed'
  | 'request-detail-declined'
  | 'request-detail-cancelled'
  | 'request-detail-error'
  | 'incoming'
  | 'incoming-empty'
  | 'incoming-error'
  | 'business'
  | 'business-pending'
  | 'business-away'
  | 'business-changes'
  | 'business-empty'
  | 'business-error'
  | 'business-paused'
  | 'editor'
  | 'order'
  | 'listing-draft'
  | 'editor-error'
  | 'notifications'
  | 'notifications-read'
  | 'notifications-empty'
  | 'notifications-error'
  | 'password-reset'
  | 'reset-password'
  | 'reset-password-expired'
  | 'reset-password-error'
  | 'profile'
  | 'profile-error'
  | 'preferences-error'
  | 'confirm-email-change'
  | 'confirm-email-change-expired'
  | 'confirm-email-change-in-use'
  | 'saved'
  | 'saved-empty'
  | 'saved-error'
  | 'products'
  | 'products-empty'
  | 'products-error'
  | 'services'
  | 'services-empty'
  | 'services-error'
  | 'admin-queue'
  | 'admin-queue-empty'
  | 'admin-queue-error'
  | 'admin-review'
  | 'admin-review-approved'
  | 'admin-review-changes-requested'
  | 'admin-review-error'
  | 'admin-review-space'
  | 'moderation-reports'
  | 'moderation-reports-empty'
  | 'moderation-reports-error'
  | 'moderation-report'
  | 'moderation-report-conversation'
  | 'moderation-report-error'
  | 'moderation-featured'
  | 'moderation-featured-error'
  | 'account-data-requested'
  | 'data-download-done'
  | 'data-download-unavailable'
  | 'staff-signed-out'
  | 'staff-network-refused'
  | 'staff-admin-only';

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
  /** The marketing site (ADR 0013): `app` is a path of that site, not of the app. */
  site?: 'marketing' | 'admin';
}

export const routes = {
  'sign-in': { app: '/sign-in', mock: 'pages/sign-in/default.html', who: 'visitor' },
  'sign-in.invalid': { app: '/sign-in', mock: 'pages/sign-in/invalid.html', who: 'visitor' },
  'sign-in.google-unavailable': {
    app: '/sign-in',
    mock: 'pages/sign-in/google-unavailable.html',
    who: 'visitor',
    stub: 'google-sign-in-off',
  },
  'sign-in.google-cancelled': {
    app: '/sign-in?error=google-cancelled',
    mock: 'pages/sign-in/google-cancelled.html',
    who: 'visitor',
  },
  'sign-in.google-refused': {
    app: '/sign-in?error=google-email',
    mock: 'pages/sign-in/google-refused.html',
    who: 'visitor',
  },
  // Log in after its form was sent: the page object's screen for the state sends it. The mock
  // also draws `loading` and `success`, which the app does not have: the shell waits for the
  // session before it shows a page, and a member who signs in is taken on with a toast.
  'sign-in.error': {
    app: '/sign-in',
    mock: 'pages/sign-in/error.html',
    who: 'visitor',
    stub: 'sign-in-failing',
  },
  'sign-in.submitting': {
    app: '/sign-in',
    mock: 'pages/sign-in/submitting.html',
    who: 'visitor',
    stub: 'sign-in-pending',
  },
  'session-expired': {
    app: '/session-expired',
    mock: 'pages/session-expired/default.html',
    who: 'visitor',
  },
  'sign-up': { app: '/join', mock: 'pages/sign-up/default.html', who: 'visitor' },
  'sign-up.google-unavailable': {
    app: '/join',
    mock: 'pages/sign-up/google-unavailable.html',
    who: 'visitor',
    stub: 'google-sign-in-off',
  },
  'sign-up.google-cancelled': {
    app: '/join?error=google-cancelled',
    mock: 'pages/sign-up/google-cancelled.html',
    who: 'visitor',
  },
  'sign-up.google-refused': {
    app: '/join?error=google-email',
    mock: 'pages/sign-up/google-refused.html',
    who: 'visitor',
  },
  // Sign up after its form was sent, as for Log in. The mock also draws `loading`, which the app
  // does not have.
  'sign-up.invalid': { app: '/join', mock: 'pages/sign-up/invalid.html', who: 'visitor' },
  'sign-up.error': {
    app: '/join',
    mock: 'pages/sign-up/error.html',
    who: 'visitor',
    stub: 'join-failing',
  },
  'sign-up.submitting': {
    app: '/join',
    mock: 'pages/sign-up/submitting.html',
    who: 'visitor',
    stub: 'join-pending',
  },
  'sign-up.success': {
    app: '/join',
    mock: 'pages/sign-up/success.html',
    who: 'visitor',
    stub: 'join-created',
  },
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
  'verify-email.success-return': {
    app: '/verify-email/e2e-token',
    mock: 'pages/verify-email/success-return.html',
    who: 'visitor',
    stub: 'verify-email-success-return',
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
  'conversation.menu': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/menu.html',
    who: 'member',
    stub: 'conversation',
  },
  'conversation.muted': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/muted.html',
    who: 'member',
    stub: 'conversation-muted',
  },
  'conversation.photo': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/photo.html',
    who: 'member',
    stub: 'conversation-photo',
  },
  'conversation.photo-attached': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/photo-attached.html',
    who: 'member',
    stub: 'conversation',
  },
  'conversation.photo-refused': {
    app: '/messages/c-legacy',
    mock: 'notifications/message-toast/danger.html',
    who: 'member',
    stub: 'conversation',
  },
  'conversation.photo-sending': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/photo-sending.html',
    who: 'member',
    stub: 'conversation-photo-sending',
  },
  'conversation.arrived': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/arrived.html',
    who: 'member',
    stub: 'conversation-arrived',
  },
  'conversation.requests': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/requests.html',
    who: 'member',
    stub: 'conversation-requests',
  },
  'new-message': {
    app: '/b/legacy-financial/message',
    mock: 'dialogs/new-message/default.html',
    who: 'member',
  },
  'book-meeting': {
    app: '/b/legacy-financial/book',
    mock: 'dialogs/book-meeting/default.html',
    who: 'member',
  },
  'request-quote': {
    app: '/b/legacy-financial/quote',
    mock: 'dialogs/request-quote/default.html',
    who: 'member',
  },
  'request-space.short-stay': {
    app: '/b/roncesvalles-guest-suite/request',
    mock: 'dialogs/request-space/short-stay.html',
    who: 'member',
  },
  'request-space.long-term': {
    app: '/b/annex-basement-apartment/request',
    mock: 'dialogs/request-space/long-term.html',
    who: 'member',
  },
  'order-request': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal/request?option=M&quantity=1',
    mock: 'dialogs/order-request/default.html',
    who: 'member',
    stub: 'order',
  },
  'church-reference': {
    app: '/reference/e2e-token',
    mock: 'pages/church-reference/default.html',
    who: 'visitor',
    stub: 'reference',
  },
  'church-reference.loading': {
    app: '/reference/e2e-token',
    mock: 'pages/church-reference/loading.html',
    who: 'visitor',
    stub: 'reference-loading',
  },
  'church-reference.error': {
    app: '/reference/e2e-token',
    mock: 'pages/church-reference/error.html',
    who: 'visitor',
    stub: 'reference-error',
  },
  'church-reference.expired': {
    app: '/reference/e2e-token',
    mock: 'pages/church-reference/expired.html',
    who: 'visitor',
    stub: 'reference-expired',
  },
  'list-business': {
    app: '/list',
    mock: 'pages/list-business/default.html',
    who: 'member',
    stub: 'listing-draft',
  },
  'list-business.space': {
    app: '/list?kind=space',
    mock: 'pages/list-business/space.html',
    who: 'member',
    stub: 'listing-draft',
  },
  'statement-of-faith': {
    app: '/statement-of-faith',
    mock: 'pages/statement-of-faith/default.html',
    who: 'visitor',
  },
  'server-error': {
    app: '/error?ref=JB-500-7F3K',
    mock: 'pages/server-error/default.html',
    who: 'visitor',
  },
  maintenance: {
    app: '/maintenance?backBy=2026-11-11T11:00:00%2B00:00',
    mock: 'pages/maintenance/default.html',
    who: 'visitor',
  },
  offline: { app: '/offline', mock: 'pages/offline/default.html', who: 'visitor' },
  terms: { app: '/terms', mock: 'pages/terms/default.html', who: 'visitor' },
  privacy: { app: '/privacy', mock: 'pages/privacy/default.html', who: 'visitor' },
  help: { app: '/help', mock: 'pages/help/default.html', who: 'visitor' },
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
  // The member chooses "Rooms" on the term filter of "Rooms & places to stay".
  'browse.rooms-term': {
    app: '/',
    mock: 'pages/browse/rooms-term.html',
    who: 'member',
  },
  // No roommate is listed, and the member chooses "Roommates".
  'browse.rooms-empty': {
    app: '/',
    mock: 'pages/browse/rooms-empty.html',
    who: 'member',
    stub: 'browse-rooms-empty',
  },
  category: { app: '/c/home-property', mock: 'pages/category/default.html', who: 'member' },
  'category.rooms-rentals': {
    app: '/c/rooms-rentals',
    mock: 'pages/category/rooms-rentals.html',
    who: 'member',
  },
  'category.rooms-rentals-empty': {
    app: '/c/rooms-rentals?term=roommate',
    mock: 'pages/category/rooms-rentals-empty.html',
    who: 'member',
    stub: 'rooms-empty',
  },
  'category.rooms-rentals-loading': {
    app: '/c/rooms-rentals',
    mock: 'pages/category/rooms-rentals-loading.html',
    who: 'member',
    stub: 'category-loading',
  },
  'category.rooms-rentals-error': {
    app: '/c/rooms-rentals',
    mock: 'pages/category/rooms-rentals-error.html',
    who: 'member',
    stub: 'category-error',
  },
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
  'space.short-stay': {
    app: '/b/roncesvalles-guest-suite',
    mock: 'pages/space/short-stay.html',
    who: 'member',
  },
  'space.long-term': {
    app: '/b/annex-basement-apartment',
    mock: 'pages/space/long-term.html',
    who: 'member',
  },
  'space.room': {
    app: '/b/leslieville-family-room',
    mock: 'pages/space/room.html',
    who: 'member',
  },
  'space.roommate': {
    app: '/b/east-york-roommate',
    mock: 'pages/space/roommate.html',
    who: 'member',
  },
  'space.requested': {
    app: '/b/roncesvalles-guest-suite',
    mock: 'pages/space/requested.html',
    who: 'member',
    stub: 'space-requested',
  },
  'space.signed-out': {
    app: '/b/roncesvalles-guest-suite',
    mock: 'pages/space/signed-out.html',
    who: 'visitor',
  },
  // Opened from the Rooms & rentals category, so the page knows it is loading a space.
  'space.loading': {
    app: '/b/roncesvalles-guest-suite',
    mock: 'pages/space/loading.html',
    who: 'member',
    stub: 'space-loading',
    via: '/c/rooms-rentals',
  },
  'space.error': {
    app: '/b/roncesvalles-guest-suite',
    mock: 'pages/space/error.html',
    who: 'member',
    stub: 'space-error',
    via: '/c/rooms-rentals',
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
  requests: {
    app: '/requests',
    mock: 'pages/requests/default.html',
    who: 'member',
    stub: 'member-requests',
  },
  'requests.empty': {
    app: '/requests',
    mock: 'pages/requests/empty.html',
    who: 'member',
    stub: 'member-requests-empty',
  },
  'requests.error': {
    app: '/requests',
    mock: 'pages/requests/error.html',
    who: 'member',
    stub: 'member-requests-error',
  },
  'request-detail': {
    app: '/requests/7a1e0000-0000-4000-8000-000000000002',
    mock: 'pages/request-detail/default.html',
    who: 'member',
    stub: 'request-detail',
  },
  'request-detail.confirmed': {
    app: '/requests/7a1e0000-0000-4000-8000-000000000001',
    mock: 'pages/request-detail/confirmed.html',
    who: 'member',
    stub: 'request-detail-confirmed',
  },
  'request-detail.declined': {
    app: '/requests/7a1e0000-0000-4000-8000-000000000002',
    mock: 'pages/request-detail/declined.html',
    who: 'member',
    stub: 'request-detail-declined',
  },
  'request-detail.cancelled': {
    app: '/requests/7a1e0000-0000-4000-8000-000000000002',
    mock: 'pages/request-detail/cancelled.html',
    who: 'member',
    stub: 'request-detail-cancelled',
  },
  'request-detail.error': {
    app: '/requests/7a1e0000-0000-4000-8000-000000000002',
    mock: 'pages/request-detail/error.html',
    who: 'member',
    stub: 'request-detail-error',
  },
  'incoming-requests': {
    app: '/my-business/requests',
    mock: 'pages/incoming-requests/default.html',
    who: 'member',
    stub: 'incoming',
  },
  'incoming-requests.empty': {
    app: '/my-business/requests',
    mock: 'pages/incoming-requests/empty.html',
    who: 'member',
    stub: 'incoming-empty',
  },
  'incoming-requests.error': {
    app: '/my-business/requests',
    mock: 'pages/incoming-requests/error.html',
    who: 'member',
    stub: 'incoming-error',
  },
  'my-business': {
    app: '/my-business',
    mock: 'pages/my-business/default.html',
    who: 'member',
    stub: 'business',
  },
  'my-business.away': {
    app: '/my-business',
    mock: 'pages/my-business/away.html',
    who: 'member',
    stub: 'business-away',
  },
  'my-business.pending': {
    app: '/my-business',
    mock: 'pages/my-business/pending.html',
    who: 'member',
    stub: 'business-pending',
  },
  'my-business.changes-requested': {
    app: '/my-business',
    mock: 'pages/my-business/changes-requested.html',
    who: 'member',
    stub: 'business-changes',
  },
  'my-business.empty': {
    app: '/my-business',
    mock: 'pages/my-business/empty.html',
    who: 'member',
    stub: 'business-empty',
  },
  'my-business.error': {
    app: '/my-business',
    mock: 'pages/my-business/error.html',
    who: 'member',
    stub: 'business-error',
  },
  'my-business.paused': {
    app: '/my-business',
    mock: 'notifications/verification-banner/persistent.html',
    who: 'member',
    stub: 'business-paused',
  },
  'edit-listing': {
    app: '/my-business/listing',
    mock: 'pages/edit-listing/default.html',
    who: 'member',
    stub: 'editor',
  },
  'edit-listing.error': {
    app: '/my-business/listing',
    mock: 'pages/edit-listing/error.html',
    who: 'member',
    stub: 'editor-error',
  },
  notifications: {
    app: '/notifications',
    mock: 'pages/notifications/default.html',
    who: 'member',
    stub: 'notifications',
  },
  'notifications.read': {
    app: '/notifications',
    mock: 'pages/notifications/read.html',
    who: 'member',
    stub: 'notifications-read',
  },
  'notifications.empty': {
    app: '/notifications',
    mock: 'pages/notifications/empty.html',
    who: 'member',
    stub: 'notifications-empty',
  },
  'notifications.error': {
    app: '/notifications',
    mock: 'pages/notifications/error.html',
    who: 'member',
    stub: 'notifications-error',
  },
  'forgot-password': {
    app: '/forgot-password',
    mock: 'pages/forgot-password/default.html',
    who: 'visitor',
    stub: 'password-reset',
  },
  'forgot-password.invalid': {
    app: '/forgot-password',
    mock: 'pages/forgot-password/invalid.html',
    who: 'visitor',
    stub: 'password-reset',
  },
  'reset-password': {
    app: '/reset-password/e2e-token',
    mock: 'pages/reset-password/default.html',
    who: 'visitor',
    stub: 'reset-password',
  },
  'reset-password.expired': {
    app: '/reset-password/e2e-token',
    mock: 'pages/reset-password/expired.html',
    who: 'visitor',
    stub: 'reset-password-expired',
  },
  'reset-password.error': {
    app: '/reset-password/e2e-token',
    mock: 'pages/reset-password/error.html',
    who: 'visitor',
    stub: 'reset-password-error',
  },
  account: { app: '/account', mock: 'pages/account/default.html', who: 'member', stub: 'profile' },
  'account.data-requested': {
    app: '/account',
    mock: 'pages/account/data-requested.html',
    who: 'member',
    stub: 'account-data-requested',
  },
  'data-download.done': {
    app: '/account/data/e2e-token',
    mock: 'pages/data-download/done.html',
    who: 'member',
    stub: 'data-download-done',
  },
  'data-download.unavailable': {
    app: '/account/data/e2e-token',
    mock: 'pages/data-download/unavailable.html',
    who: 'member',
    stub: 'data-download-unavailable',
  },
  'account.error': {
    app: '/account',
    mock: 'pages/account/error.html',
    who: 'member',
    stub: 'profile-error',
  },
  preferences: {
    app: '/account/notifications',
    mock: 'pages/preferences/default.html',
    who: 'member',
    stub: 'profile',
  },
  'preferences.error': {
    app: '/account/notifications',
    mock: 'pages/preferences/error.html',
    who: 'member',
    stub: 'preferences-error',
  },
  'confirm-email-change.success': {
    app: '/confirm-email-change/e2e-token',
    mock: 'pages/confirm-email-change/success.html',
    who: 'visitor',
    stub: 'confirm-email-change',
  },
  'confirm-email-change.expired': {
    app: '/confirm-email-change/e2e-token',
    mock: 'pages/confirm-email-change/expired.html',
    who: 'visitor',
    stub: 'confirm-email-change-expired',
  },
  'confirm-email-change.in-use': {
    app: '/confirm-email-change/e2e-token',
    mock: 'pages/confirm-email-change/in-use.html',
    who: 'visitor',
    stub: 'confirm-email-change-in-use',
  },
  saved: { app: '/saved', mock: 'pages/saved/default.html', who: 'member', stub: 'saved' },
  'saved.empty': {
    app: '/saved',
    mock: 'pages/saved/empty.html',
    who: 'member',
    stub: 'saved-empty',
  },
  'saved.error': {
    app: '/saved',
    mock: 'pages/saved/error.html',
    who: 'member',
    stub: 'saved-error',
  },
  'my-products': {
    app: '/my-business/products',
    mock: 'pages/my-products/default.html',
    who: 'member',
    stub: 'products',
  },
  'my-products.empty': {
    app: '/my-business/products',
    mock: 'pages/my-products/empty.html',
    who: 'member',
    stub: 'products-empty',
  },
  'my-products.error': {
    app: '/my-business/products',
    mock: 'pages/my-products/error.html',
    who: 'member',
    stub: 'products-error',
  },
  'my-services': {
    app: '/my-business/services',
    mock: 'pages/my-services/default.html',
    who: 'member',
    stub: 'services',
  },
  'my-services.empty': {
    app: '/my-business/services',
    mock: 'pages/my-services/empty.html',
    who: 'member',
    stub: 'services-empty',
  },
  'my-services.error': {
    app: '/my-business/services',
    mock: 'pages/my-services/error.html',
    who: 'member',
    stub: 'services-error',
  },
  'admin-verifications': {
    app: '/verifications',
    mock: 'pages/admin-verifications/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-queue',
  },
  'admin-verifications.empty': {
    app: '/verifications',
    mock: 'pages/admin-verifications/empty.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-queue-empty',
  },
  'admin-verifications.error': {
    app: '/verifications',
    mock: 'pages/admin-verifications/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-queue-error',
  },
  'admin-verification': {
    app: '/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-review',
  },
  'admin-verification.approved': {
    app: '/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/approved.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-review-approved',
  },
  'admin-verification.changes-requested': {
    app: '/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/changes-requested.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-review-changes-requested',
  },
  'admin-verification.space': {
    app: '/admin/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/space.html',
    who: 'member',
    stub: 'admin-review-space',
  },
  'admin-verification.error': {
    app: '/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-review-error',
  },
  'admin-reports': {
    app: '/reports',
    mock: 'pages/admin-reports/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-reports',
  },
  'admin-reports.empty': {
    app: '/reports',
    mock: 'pages/admin-reports/empty.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-reports-empty',
  },
  'admin-reports.error': {
    app: '/reports',
    mock: 'pages/admin-reports/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-reports-error',
  },
  'admin-report': {
    app: '/reports/5b0c7a10-2d4e-4f6a-8b1c-0123456789ab',
    mock: 'pages/admin-report/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-report',
  },
  'admin-report.conversation': {
    app: '/reports/6c1d8b21-3e5f-4a7b-9c2d-123456789abc',
    mock: 'pages/admin-report/conversation.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-report-conversation',
  },
  'admin-report.error': {
    app: '/reports/5b0c7a10-2d4e-4f6a-8b1c-0123456789ab',
    mock: 'pages/admin-report/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-report-error',
  },
  'admin-featured': {
    app: '/featured',
    mock: 'pages/admin-featured/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-featured',
  },
  'admin-featured.error': {
    app: '/featured',
    mock: 'pages/admin-featured/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-featured-error',
  },
  'admin-sign-in': {
    app: '/sign-in',
    mock: 'pages/admin-sign-in/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-signed-out',
  },
  'admin-sign-in.second-factor-missing': {
    app: '/sign-in?error=second-factor',
    mock: 'pages/admin-sign-in/second-factor-missing.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-signed-out',
  },
  'admin-sign-in.not-staff': {
    app: '/sign-in?error=not-staff',
    mock: 'pages/admin-sign-in/not-staff.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-signed-out',
  },
  'admin-sign-in.error': {
    app: '/sign-in?error=sso',
    mock: 'pages/admin-sign-in/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-signed-out',
  },
  'admin-sign-in.network-refused': {
    app: '/sign-in',
    mock: 'pages/admin-sign-in/network-refused.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-network-refused',
  },
  'admin-sign-in.signed-out': {
    app: '/signed-out',
    mock: 'pages/admin-sign-in/signed-out.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-signed-out',
  },
  'admin-sign-in.session-expired': {
    app: '/session-expired',
    mock: 'pages/admin-sign-in/session-expired.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-signed-out',
  },
  'admin-shell.admin-only': {
    app: '/verifications',
    mock: 'pages/admin-shell/admin-only.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-admin-only',
  },
  'admin-shell.not-found': {
    app: '/no-such-page',
    mock: 'pages/admin-shell/not-found.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-queue',
  },
  'admin-moved': {
    app: '/admin/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-moved/default.html',
    who: 'member',
  },
  forbidden: {
    app: '/forbidden',
    mock: 'pages/forbidden/default.html',
    who: 'member',
  },
  'not-found': { app: '/no-such-page', mock: 'pages/not-found/default.html', who: 'member' },
  'marketing-home': {
    app: '/',
    mock: 'pages/marketing-home/default.html',
    who: 'visitor',
    site: 'marketing',
  },
  'marketing-home.playing': {
    app: '/',
    mock: 'pages/marketing-home/playing.html',
    who: 'visitor',
    site: 'marketing',
  },
} as const satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
