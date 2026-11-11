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
  | 'reference'
  | 'reference-loading'
  | 'reference-error'
  | 'reference-expired'
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
  | 'conversation-error'
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
  | 'business-changes'
  | 'business-empty'
  | 'business-error'
  | 'business-paused'
  | 'editor'
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
  | 'forbidden';

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
  'order-request': {
    app: '/b/luzandre/p/faith-heavyweight-tee-charcoal/request?option=M&quantity=1',
    mock: 'dialogs/order-request/default.html',
    who: 'member',
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
    app: '/admin/verifications',
    mock: 'pages/admin-verifications/default.html',
    who: 'member',
    stub: 'admin-queue',
  },
  'admin-verifications.empty': {
    app: '/admin/verifications',
    mock: 'pages/admin-verifications/empty.html',
    who: 'member',
    stub: 'admin-queue-empty',
  },
  'admin-verifications.error': {
    app: '/admin/verifications',
    mock: 'pages/admin-verifications/error.html',
    who: 'member',
    stub: 'admin-queue-error',
  },
  'admin-verification': {
    app: '/admin/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/default.html',
    who: 'member',
    stub: 'admin-review',
  },
  'admin-verification.approved': {
    app: '/admin/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/approved.html',
    who: 'member',
    stub: 'admin-review-approved',
  },
  'admin-verification.changes-requested': {
    app: '/admin/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/changes-requested.html',
    who: 'member',
    stub: 'admin-review-changes-requested',
  },
  'admin-verification.error': {
    app: '/admin/verifications/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-verification/error.html',
    who: 'member',
    stub: 'admin-review-error',
  },
  'admin-reports': {
    app: '/admin/reports',
    mock: 'pages/admin-reports/default.html',
    who: 'member',
    stub: 'moderation-reports',
  },
  'admin-reports.empty': {
    app: '/admin/reports',
    mock: 'pages/admin-reports/empty.html',
    who: 'member',
    stub: 'moderation-reports-empty',
  },
  'admin-reports.error': {
    app: '/admin/reports',
    mock: 'pages/admin-reports/error.html',
    who: 'member',
    stub: 'moderation-reports-error',
  },
  'admin-report': {
    app: '/admin/reports/5b0c7a10-2d4e-4f6a-8b1c-0123456789ab',
    mock: 'pages/admin-report/default.html',
    who: 'member',
    stub: 'moderation-report',
  },
  'admin-report.conversation': {
    app: '/admin/reports/6c1d8b21-3e5f-4a7b-9c2d-123456789abc',
    mock: 'pages/admin-report/conversation.html',
    who: 'member',
    stub: 'moderation-report-conversation',
  },
  'admin-report.error': {
    app: '/admin/reports/5b0c7a10-2d4e-4f6a-8b1c-0123456789ab',
    mock: 'pages/admin-report/error.html',
    who: 'member',
    stub: 'moderation-report-error',
  },
  'admin-featured': {
    app: '/admin/featured',
    mock: 'pages/admin-featured/default.html',
    who: 'member',
    stub: 'moderation-featured',
  },
  'admin-featured.error': {
    app: '/admin/featured',
    mock: 'pages/admin-featured/error.html',
    who: 'member',
    stub: 'moderation-featured-error',
  },
  forbidden: {
    app: '/forbidden',
    mock: 'pages/forbidden/default.html',
    who: 'member',
    stub: 'forbidden',
  },
  'not-found': { app: '/no-such-page', mock: 'pages/not-found/default.html', who: 'member' },
} as const satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
