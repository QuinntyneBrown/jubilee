/**
 * Every screen state the suite opens, keyed once so one spec serves both targets:
 * the Angular app (`app` path plus the scenario that produces the state) and the
 * design reference (`mock` file under docs/mocks, opened when JB_BASELINE=1).
 */
export type Who = 'visitor' | 'member';

/** Names a data stub in `fixtures/stubs.ts`; absent means the recorded answers of the seeded API (ADR 0009). */
export type StubName =
  | 'browse-loading'
  | 'quote'
  | 'browse-empty'
  | 'browse-error'
  | 'browse-edge'
  | 'category-loading'
  | 'category-empty'
  | 'category-error'
  | 'category-long'
  | 'category-not-found'
  | 'browse-rooms-empty'
  | 'browse-saved-hearts'
  | 'space-loading'
  | 'space-error'
  | 'space-requested'
  | 'platform-owner'
  | 'platform-preview'
  | 'platform-error'
  | 'platform-no-website'
  | 'rooms-empty'
  | 'platforms-empty'
  | 'business-loading'
  | 'business-retrying'
  | 'business-empty'
  | 'business-edge'
  | 'business-owner'
  | 'business-photos'
  | 'business-preview'
  | 'business-replies-fast'
  | 'reviews-member'
  | 'reviews-empty'
  | 'reviews-mine'
  | 'reviews-owner'
  | 'reviews-loading'
  | 'reviews-error'
  | 'reviews-not-eligible'
  | 'write-review'
  | 'write-review-single-item'
  | 'write-review-space'
  | 'write-review-not-eligible'
  | 'shop-loading'
  | 'shop-error'
  | 'shop-empty'
  | 'shop-sold-out'
  | 'product-loading'
  | 'product-error'
  | 'product-sold-out'
  | 'product-alert-requested'
  | 'search-loading'
  | 'search-error'
  | 'search-no-results'
  | 'search-start'
  | 'search-spaces'
  | 'google-sign-in-off'
  | 'profile-this-device-only'
  | 'profile-other-devices'
  | 'profile-other-devices-pending'
  | 'profile-other-devices-failing'
  | 'message-draft-restored'
  | 'sign-in-failing'
  | 'sign-in-pending'
  | 'launch-notify-pending'
  | 'launch-notify-failing'
  | 'launch-notify-recovering'
  | 'launch-notify-limited'
  | 'launch-notify-challenge'
  | 'launch-notify-refused-field'
  | 'launch-notify-unreachable'
  | 'launch-business-pending'
  | 'launch-business-failing'
  | 'launch-business-recovering'
  | 'launch-business-limited'
  | 'launch-business-challenge'
  | 'launch-business-refused-fields'
  | 'launch-business-unreachable'
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
  | 'messages-more'
  | 'messages-owner'
  | 'conversation-away'
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
  | 'request-detail-unanswered'
  | 'incoming'
  | 'incoming-empty'
  | 'incoming-error'
  | 'incoming-confirmed'
  | 'business'
  | 'business-away'
  | 'business-switcher'
  | 'business-empty'
  | 'business-retrying'
  | 'business-paused'
  | 'business-statement-due'
  | 'business-statement-pending'
  | 'business-statement-failing'
  | 'business-statement-lapsed'
  | 'editor'
  | 'editor-photos'
  | 'order'
  | 'listing-draft'
  | 'editor-error'
  | 'editor-space'
  | 'notifications'
  | 'notifications-read'
  | 'notifications-empty'
  | 'notifications-error'
  | 'notifications-back-in-stock'
  | 'password-reset'
  | 'password-reset-rate-limited'
  | 'reset-password'
  | 'reset-password-expired'
  | 'reset-password-error'
  | 'profile'
  | 'profile-error'
  | 'profile-sessions-loading'
  | 'profile-sessions-error'
  | 'preferences-error'
  | 'confirm-email-change'
  | 'confirm-email-change-expired'
  | 'confirm-email-change-in-use'
  | 'unsubscribe'
  | 'unsubscribe-summary'
  | 'unsubscribe-invalid'
  | 'unsubscribe-error'
  | 'unsubscribe-loading'
  | 'feedback'
  | 'feedback-empty'
  | 'feedback-loading'
  | 'feedback-error'
  | 'feedback-no-business'
  | 'feedback-check-in'
  | 'saved'
  | 'saved-empty'
  | 'saved-error'
  | 'products'
  | 'products-empty'
  | 'products-error'
  | 'services'
  | 'services-empty'
  | 'services-error'
  | 'services-hours-pending'
  | 'services-hours-failing'
  | 'admin-listings'
  | 'admin-listings-empty'
  | 'admin-listings-error'
  | 'admin-listing'
  | 'admin-listing-taken-down'
  | 'admin-listing-error'
  | 'admin-listing-space'
  | 'moderation-reports'
  | 'moderation-reports-empty'
  | 'moderation-reports-error'
  | 'moderation-report'
  | 'moderation-report-conversation'
  | 'moderation-report-review'
  | 'moderation-report-error'
  | 'moderation-featured'
  | 'moderation-featured-error'
  | 'account-data-requested'
  | 'account-data-build-failed'
  | 'data-download-done'
  | 'data-download-unavailable'
  | 'staff-signed-out'
  | 'staff-network-refused'
  | 'staff-admin-only'
  | 'admin-policies'
  | 'admin-policies-loading'
  | 'admin-policies-error'
  | 'admin-policies-moderator'
  | 'admin-policy'
  | 'admin-policy-loading'
  | 'admin-policy-empty'
  | 'admin-policy-error'
  | 'admin-policy-publishing'
  | 'admin-policy-publish-failing'
  | 'admin-policy-conflict';

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
  'messages.more': {
    app: '/messages',
    mock: 'pages/messages/more.html',
    who: 'member',
    stub: 'messages-more',
  },
  'messages.owner': {
    app: '/messages',
    mock: 'pages/messages/owner.html',
    who: 'member',
    stub: 'messages-owner',
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
  'conversation.away': {
    app: '/messages/c-legacy',
    mock: 'pages/conversation/away.html',
    who: 'member',
    stub: 'conversation-away',
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
  'new-message.restored': {
    app: '/b/legacy-financial/message',
    mock: 'dialogs/new-message/restored.html',
    who: 'member',
    stub: 'message-draft-restored',
  },
  'book-meeting': {
    app: '/b/legacy-financial/book',
    mock: 'dialogs/book-meeting/default.html',
    who: 'member',
  },
  'share-listing': {
    app: '/b/legacy-financial/share',
    mock: 'dialogs/share-listing/default.html',
    who: 'member',
  },
  'report-listing': {
    app: '/b/legacy-financial/report',
    mock: 'dialogs/report-listing/default.html',
    who: 'member',
  },
  'request-quote': {
    app: '/b/luzandre/quote',
    mock: 'dialogs/request-quote/default.html',
    who: 'member',
    stub: 'quote',
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
  // The platform form (L2-249); its invalid, busy and success states are reached by using it.
  'list-business.platform': {
    app: '/list?kind=platform',
    mock: 'pages/list-business/platform.html',
    who: 'member',
    stub: 'listing-draft',
  },
  // The editors opened from "Add a product" and "Add a service" on /list (L2-073).
  'product-editor.onboarding': {
    app: '/list',
    mock: 'dialogs/product-editor/onboarding.html',
    who: 'member',
    stub: 'listing-draft',
  },
  'service-editor.onboarding': {
    app: '/list',
    mock: 'dialogs/service-editor/onboarding.html',
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
  // The static copies the app's host serves when the app cannot answer a page load (L2-115 AC3, L2-117 AC1, ADR 0056).
  'static-server-error': {
    app: '/static/server-error.html',
    mock: 'pages/server-error/default.html',
    who: 'visitor',
  },
  'static-maintenance': {
    app: '/static/maintenance.html',
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
  'browse.saved-hearts': {
    app: '/',
    mock: 'pages/browse/saved-hearts.html',
    who: 'member',
    stub: 'browse-saved-hearts',
  },
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
  // Software platforms (L2-252): business cards, a sort and no filters.
  'category.software-platforms': {
    app: '/c/software-platforms',
    mock: 'pages/category/software-platforms.html',
    who: 'member',
  },
  'category.software-platforms-empty': {
    app: '/c/software-platforms',
    mock: 'pages/category/software-platforms-empty.html',
    who: 'member',
    stub: 'platforms-empty',
  },
  'category.software-platforms-loading': {
    app: '/c/software-platforms',
    mock: 'pages/category/software-platforms-loading.html',
    who: 'member',
    stub: 'category-loading',
  },
  'category.software-platforms-error': {
    app: '/c/software-platforms',
    mock: 'pages/category/software-platforms-error.html',
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
    stub: 'reviews-member',
  },
  'business.reviews-empty': {
    app: '/b/deeks-insurance',
    mock: 'pages/business/reviews-empty.html',
    who: 'member',
    stub: 'reviews-empty',
  },
  'business.reviews-mine': {
    app: '/b/legacy-financial',
    mock: 'pages/business/reviews-mine.html',
    who: 'member',
    stub: 'reviews-mine',
  },
  'business.reviews-owner': {
    app: '/b/luzandre',
    mock: 'pages/business/reviews-owner.html',
    who: 'member',
    stub: 'reviews-owner',
  },
  'business.reviews-loading': {
    app: '/b/legacy-financial',
    mock: 'pages/business/reviews-loading.html',
    who: 'member',
    stub: 'reviews-loading',
  },
  'business.reviews-error': {
    app: '/b/legacy-financial',
    mock: 'pages/business/reviews-error.html',
    who: 'member',
    stub: 'reviews-error',
  },
  'business.reviews-not-eligible': {
    app: '/b/legacy-financial',
    mock: 'pages/business/reviews-not-eligible.html',
    who: 'member',
    stub: 'reviews-not-eligible',
  },
  'write-review': {
    app: '/b/legacy-financial/review',
    mock: 'pages/write-review/default.html',
    who: 'member',
    stub: 'write-review',
  },
  // Posted in the app by rating and writing (the parity spec's arrange); the mock is the state.
  'write-review.posted': {
    app: '/b/legacy-financial/review',
    mock: 'pages/write-review/posted.html',
    who: 'member',
    stub: 'write-review',
  },
  'write-review.single-item': {
    app: '/b/deeks-insurance/review',
    mock: 'pages/write-review/single-item.html',
    who: 'member',
    stub: 'write-review-single-item',
  },
  'write-review.space': {
    app: '/b/roncesvalles-guest-suite/review',
    mock: 'pages/write-review/space.html',
    who: 'member',
    stub: 'write-review-space',
  },
  'write-review.not-eligible': {
    app: '/b/luzandre/review',
    mock: 'pages/write-review/not-eligible.html',
    who: 'member',
    stub: 'write-review-not-eligible',
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
    stub: 'business-retrying',
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
  'business.photos': {
    app: '/b/legacy-financial',
    mock: 'pages/business/photos.html',
    who: 'member',
    stub: 'business-photos',
  },
  'business.preview': {
    app: '/b/legacy-financial',
    mock: 'pages/business/preview.html',
    who: 'member',
    stub: 'business-preview',
  },
  'business.replies-fast': {
    app: '/b/legacy-financial',
    mock: 'pages/business/replies-fast.html',
    who: 'member',
    stub: 'business-replies-fast',
  },
  // The page of a software platform (L2-254): Lanternread, from the seeded platforms.
  platform: { app: '/b/lanternread', mock: 'pages/platform/default.html', who: 'member' },
  'platform.signed-out': {
    app: '/b/lanternread',
    mock: 'pages/platform/signed-out.html',
    who: 'visitor',
  },
  'platform.owner': {
    app: '/b/lanternread',
    mock: 'pages/platform/owner.html',
    who: 'member',
    stub: 'platform-owner',
  },
  'platform.preview': {
    app: '/b/lanternread',
    mock: 'pages/platform/preview.html',
    who: 'member',
    stub: 'platform-preview',
  },
  // Opened from Software platforms, so the page knows it failed to load a platform.
  'platform.error': {
    app: '/b/lanternread',
    mock: 'pages/platform/error.html',
    who: 'member',
    stub: 'platform-error',
    via: '/c/software-platforms',
  },
  // A stored address the rules refuse: no link out (L2-255 AC5). The mocks draw no such state.
  'platform.no-website': {
    app: '/b/lanternread',
    mock: 'pages/platform/default.html',
    who: 'member',
    stub: 'platform-no-website',
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
  'shop.sold-out': {
    app: '/b/luzandre',
    mock: 'pages/shop/sold-out.html',
    who: 'member',
    stub: 'shop-sold-out',
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
  'search.spaces': {
    app: '/search?q=room',
    mock: 'pages/search/spaces.html',
    who: 'visitor',
    stub: 'search-spaces',
  },
  // A software platform among the businesses (L2-253 AC2).
  'search.platforms': {
    app: '/search?q=reading',
    mock: 'pages/search/platforms.html',
    who: 'member',
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
  'request-detail.unanswered': {
    app: '/requests/7a1e0000-0000-4000-8000-000000000002',
    mock: 'pages/request-detail/unanswered.html',
    who: 'member',
    stub: 'request-detail-unanswered',
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
  // The page object chooses the Confirmed tab before the state is read (L2-225).
  'incoming-requests.confirmed': {
    app: '/my-business/requests',
    mock: 'pages/incoming-requests/confirmed.html',
    who: 'member',
    stub: 'incoming-confirmed',
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
  'my-business.businesses': {
    app: '/my-business',
    mock: 'pages/my-business/businesses.html',
    who: 'member',
    stub: 'business-switcher',
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
    stub: 'business-retrying',
  },
  'my-business.paused': {
    app: '/my-business',
    mock: 'notifications/listing-banner/persistent.html',
    who: 'member',
    stub: 'business-paused',
  },
  'my-business.statement-due': {
    app: '/my-business',
    mock: 'pages/my-business/statement-due.html',
    who: 'member',
    stub: 'business-statement-due',
  },
  'my-business.statement-lapsed': {
    app: '/my-business',
    mock: 'pages/my-business/statement-lapsed.html',
    who: 'member',
    stub: 'business-statement-lapsed',
  },
  'statement-agreement': {
    app: '/my-business',
    mock: 'dialogs/statement-agreement/default.html',
    who: 'member',
    stub: 'business-statement-due',
  },
  'statement-agreement.busy': {
    app: '/my-business',
    mock: 'dialogs/statement-agreement/busy.html',
    who: 'member',
    stub: 'business-statement-pending',
  },
  'statement-agreement.failed': {
    app: '/my-business',
    mock: 'dialogs/statement-agreement/failed.html',
    who: 'member',
    stub: 'business-statement-failing',
  },
  'statement-agreement.lapsed': {
    app: '/my-business',
    mock: 'dialogs/statement-agreement/lapsed.html',
    who: 'member',
    stub: 'business-statement-lapsed',
  },
  'edit-listing': {
    app: '/my-business/listing',
    mock: 'pages/edit-listing/default.html',
    who: 'member',
    stub: 'editor',
  },
  'edit-listing.photos': {
    app: '/my-business/listing',
    mock: 'pages/edit-listing/photos.html',
    who: 'member',
    stub: 'editor-photos',
  },
  'edit-listing.space': {
    app: '/my-business/listing',
    mock: 'pages/edit-listing/space.html',
    who: 'member',
    stub: 'editor-space',
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
  'notifications.back-in-stock': {
    app: '/notifications',
    mock: 'pages/notifications/back-in-stock.html',
    who: 'member',
    stub: 'notifications-back-in-stock',
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
  'forgot-password.rate-limited': {
    app: '/forgot-password',
    mock: 'pages/forgot-password/rate-limited.html',
    who: 'visitor',
    stub: 'password-reset-rate-limited',
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
  'account.this-device-only': {
    app: '/account',
    mock: 'pages/account/this-device-only.html',
    who: 'member',
    stub: 'profile-this-device-only',
  },
  'account.sessions-loading': {
    app: '/account',
    mock: 'pages/account/sessions-loading.html',
    who: 'member',
    stub: 'profile-sessions-loading',
  },
  'account.sessions-error': {
    app: '/account',
    mock: 'pages/account/sessions-error.html',
    who: 'member',
    stub: 'profile-sessions-error',
  },
  'account.session-ended': {
    app: '/account',
    mock: 'pages/account/session-ended.html',
    who: 'member',
    stub: 'profile',
  },
  'account.others-signed-out': {
    app: '/account',
    mock: 'pages/account/others-signed-out.html',
    who: 'member',
    stub: 'profile-other-devices',
  },
  'sign-out-others': {
    app: '/account',
    mock: 'dialogs/sign-out-others/default.html',
    who: 'member',
    stub: 'profile-other-devices',
  },
  'sign-out-others.busy': {
    app: '/account',
    mock: 'dialogs/sign-out-others/busy.html',
    who: 'member',
    stub: 'profile-other-devices-pending',
  },
  'sign-out-others.failed': {
    app: '/account',
    mock: 'dialogs/sign-out-others/failed.html',
    who: 'member',
    stub: 'profile-other-devices-failing',
  },
  'account.data-requested': {
    app: '/account',
    mock: 'pages/account/data-requested.html',
    who: 'member',
    stub: 'account-data-requested',
  },
  'account.data-build-failed': {
    app: '/account',
    mock: 'pages/account/data-build-failed.html',
    who: 'member',
    stub: 'account-data-build-failed',
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
  // The link in the footer of a notification e-mail (L2-224). It needs no sign-in.
  'unsubscribe.loading': {
    app: '/unsubscribe/e2e-token',
    mock: 'pages/unsubscribe/loading.html',
    who: 'visitor',
    stub: 'unsubscribe-loading',
  },
  'unsubscribe.success': {
    app: '/unsubscribe/e2e-token',
    mock: 'pages/unsubscribe/success.html',
    who: 'visitor',
    stub: 'unsubscribe',
  },
  'unsubscribe.summary': {
    app: '/unsubscribe/e2e-token',
    mock: 'pages/unsubscribe/summary.html',
    who: 'visitor',
    stub: 'unsubscribe-summary',
  },
  'unsubscribe.invalid': {
    app: '/unsubscribe/e2e-token',
    mock: 'pages/unsubscribe/invalid.html',
    who: 'visitor',
    stub: 'unsubscribe-invalid',
  },
  'unsubscribe.error': {
    app: '/unsubscribe/e2e-token',
    mock: 'pages/unsubscribe/error.html',
    who: 'visitor',
    stub: 'unsubscribe-error',
  },
  // Member feedback (L2-210 to L2-213). The panel has no address: its screen opens it.
  'browse.feedback-launcher': {
    app: '/',
    mock: 'pages/browse/feedback-launcher.html',
    who: 'member',
  },
  'feedback-panel': { app: '/', mock: 'dialogs/feedback/default.html', who: 'member' },
  'feedback-panel.rate-chosen': {
    app: '/',
    mock: 'dialogs/feedback/rate-chosen.html',
    who: 'member',
  },
  'feedback-panel.bug': { app: '/', mock: 'dialogs/feedback/bug.html', who: 'member' },
  'feedback-panel.kudos': { app: '/', mock: 'dialogs/feedback/kudos.html', who: 'member' },
  'feedback-panel.kudos-ready': {
    app: '/',
    mock: 'dialogs/feedback/kudos-ready.html',
    who: 'member',
  },
  'feedback-panel.sent-rating': {
    app: '/',
    mock: 'dialogs/feedback/sent-rating.html',
    who: 'member',
    stub: 'feedback',
  },
  feedback: {
    app: '/feedback/rate',
    mock: 'pages/feedback/default.html',
    who: 'member',
    stub: 'feedback',
  },
  'feedback.rate-invalid': {
    app: '/feedback/rate',
    mock: 'pages/feedback/rate-invalid.html',
    who: 'member',
    stub: 'feedback',
  },
  'feedback.bug': {
    app: '/feedback/bug',
    mock: 'pages/feedback/bug.html',
    who: 'member',
    stub: 'feedback',
  },
  'feedback.bug-invalid': {
    app: '/feedback/bug',
    mock: 'pages/feedback/bug-invalid.html',
    who: 'member',
    stub: 'feedback',
  },
  'feedback.bug-screenshots': {
    app: '/feedback/bug',
    mock: 'pages/feedback/bug-screenshots.html',
    who: 'member',
    stub: 'feedback',
  },
  'feedback.kudos': {
    app: '/feedback/kudos',
    mock: 'pages/feedback/kudos.html',
    who: 'member',
    stub: 'feedback',
  },
  'feedback.kudos-no-business': {
    app: '/feedback/kudos',
    mock: 'pages/feedback/kudos-no-business.html',
    who: 'member',
    stub: 'feedback-no-business',
  },
  'feedback.history-empty': {
    app: '/feedback/rate',
    mock: 'pages/feedback/history-empty.html',
    who: 'member',
    stub: 'feedback-empty',
  },
  'feedback.history-loading': {
    app: '/feedback/rate',
    mock: 'pages/feedback/history-loading.html',
    who: 'member',
    stub: 'feedback-loading',
  },
  'feedback.history-error': {
    app: '/feedback/rate',
    mock: 'pages/feedback/history-error.html',
    who: 'member',
    stub: 'feedback-error',
  },
  'list-business.success': {
    app: '/list',
    mock: 'pages/list-business/success.html',
    who: 'member',
    stub: 'feedback-check-in',
  },
  'list-business.success-check-in-low': {
    app: '/list',
    mock: 'pages/list-business/success-check-in-low.html',
    who: 'member',
    stub: 'feedback-check-in',
  },
  'list-business.success-check-in-thanks': {
    app: '/list',
    mock: 'pages/list-business/success-check-in-thanks.html',
    who: 'member',
    stub: 'feedback-check-in',
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
  'my-products.reorder': {
    app: '/my-business/products',
    mock: 'pages/my-products/reorder.html',
    who: 'member',
    stub: 'products',
  },
  'product-editor.photo-uploading': {
    app: '/my-business/products',
    mock: 'dialogs/product-editor/photo-uploading.html',
    who: 'member',
    stub: 'products',
  },
  'product-editor.photo-added': {
    app: '/my-business/products',
    mock: 'dialogs/product-editor/photo-added.html',
    who: 'member',
    stub: 'products',
  },
  'product-editor.photo-failed': {
    app: '/my-business/products',
    mock: 'dialogs/product-editor/photo-failed.html',
    who: 'member',
    stub: 'products',
  },
  'product-editor.photo-too-large': {
    app: '/my-business/products',
    mock: 'dialogs/product-editor/photo-too-large.html',
    who: 'member',
    stub: 'products',
  },
  'product-editor.options': {
    app: '/my-business/products',
    mock: 'dialogs/product-editor/options.html',
    who: 'member',
    stub: 'products',
  },
  'product-editor.options-invalid': {
    app: '/my-business/products',
    mock: 'dialogs/product-editor/options-invalid.html',
    who: 'member',
    stub: 'products',
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
  'my-services.reorder': {
    app: '/my-business/services',
    mock: 'pages/my-services/reorder.html',
    who: 'member',
    stub: 'services',
  },
  'meeting-hours': {
    app: '/my-business/services',
    mock: 'dialogs/meeting-hours/default.html',
    who: 'member',
    stub: 'services',
  },
  'meeting-hours.invalid': {
    app: '/my-business/services',
    mock: 'dialogs/meeting-hours/invalid.html',
    who: 'member',
    stub: 'services',
  },
  'meeting-hours.busy': {
    app: '/my-business/services',
    mock: 'dialogs/meeting-hours/busy.html',
    who: 'member',
    stub: 'services-hours-pending',
  },
  'meeting-hours.failed': {
    app: '/my-business/services',
    mock: 'dialogs/meeting-hours/failed.html',
    who: 'member',
    stub: 'services-hours-failing',
  },
  'meeting-hours.success': {
    app: '/my-business/services',
    mock: 'dialogs/meeting-hours/success.html',
    who: 'member',
    stub: 'services',
  },
  'admin-listings': {
    app: '/listings',
    mock: 'pages/admin-listings/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listings',
  },
  'admin-listings.empty': {
    app: '/listings',
    mock: 'pages/admin-listings/empty.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listings-empty',
  },
  'admin-listings.error': {
    app: '/listings',
    mock: 'pages/admin-listings/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listings-error',
  },
  'admin-listing': {
    app: '/listings/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-listing/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listing',
  },
  'admin-listing.taken-down': {
    app: '/listings/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-listing/taken-down.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listing-taken-down',
  },
  'admin-listing.space': {
    app: '/listings/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-listing/space.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listing-space',
  },
  'admin-listing.error': {
    app: '/listings/3f1d2c4e-7a55-4c0e-9d3a-0a1b2c3d4e5f',
    mock: 'pages/admin-listing/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listing-error',
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
  'admin-report.review': {
    app: '/reports/7d2e9c32-4f60-4b8c-8d3e-23456789abcd',
    mock: 'pages/admin-report/review.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-report-review',
  },
  // The report of a review with "Take the review down" opened; the screen opens it.
  'report-action.take-down': {
    app: '/reports/7d2e9c32-4f60-4b8c-8d3e-23456789abcd',
    mock: 'dialogs/report-action/take-down.html',
    who: 'visitor',
    site: 'admin',
    stub: 'moderation-report-review',
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
    app: '/listings',
    mock: 'pages/admin-shell/admin-only.html',
    who: 'visitor',
    site: 'admin',
    stub: 'staff-admin-only',
  },
  'admin-policies': {
    app: '/policies',
    mock: 'pages/admin-policies/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policies',
  },
  'admin-policies.loading': {
    app: '/policies',
    mock: 'pages/admin-policies/loading.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policies-loading',
  },
  'admin-policies.error': {
    app: '/policies',
    mock: 'pages/admin-policies/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policies-error',
  },
  'admin-policies.forbidden': {
    app: '/policies',
    mock: 'pages/admin-policies/forbidden.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policies-moderator',
  },
  'admin-policy': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy',
  },
  'admin-policy.loading': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/loading.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy-loading',
  },
  'admin-policy.empty': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/empty.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy-empty',
  },
  'admin-policy.invalid': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/invalid.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy',
  },
  'admin-policy.published': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/published.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy',
  },
  'admin-policy.error': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy-error',
  },
  'admin-policy.forbidden': {
    app: '/policies/privacy',
    mock: 'pages/admin-policy/forbidden.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policies-moderator',
  },
  'publish-policy': {
    app: '/policies/privacy',
    mock: 'dialogs/publish-policy/default.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy',
  },
  'publish-policy.busy': {
    app: '/policies/privacy',
    mock: 'dialogs/publish-policy/busy.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy-publishing',
  },
  'publish-policy.error': {
    app: '/policies/privacy',
    mock: 'dialogs/publish-policy/error.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy-publish-failing',
  },
  'publish-policy.conflict': {
    app: '/policies/privacy',
    mock: 'dialogs/publish-policy/conflict.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-policy-conflict',
  },
  'admin-shell.not-found': {
    app: '/no-such-page',
    mock: 'pages/admin-shell/not-found.html',
    who: 'visitor',
    site: 'admin',
    stub: 'admin-listings',
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
  'marketing-home.business-invalid': {
    app: '/',
    mock: 'pages/marketing-home/business-invalid.html',
    who: 'visitor',
    site: 'marketing',
  },
  'marketing-home.business-busy': {
    app: '/',
    mock: 'pages/marketing-home/business-busy.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-pending',
  },
  'marketing-home.business-success': {
    app: '/',
    mock: 'pages/marketing-home/business-success.html',
    who: 'visitor',
    site: 'marketing',
  },
  'marketing-home.business-retrying': {
    app: '/',
    mock: 'pages/marketing-home/business-retrying.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-failing',
  },
  'marketing-home.business-recovered': {
    app: '/',
    mock: 'pages/marketing-home/business-success.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-recovering',
  },
  'marketing-home.business-rate-limited': {
    app: '/',
    mock: 'pages/marketing-home/business-rate-limited.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-limited',
  },
  'marketing-home.business-challenge-failed': {
    app: '/',
    mock: 'pages/marketing-home/business-challenge-failed.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-challenge',
  },
  'marketing-home.notify-invalid': {
    app: '/',
    mock: 'pages/marketing-home/notify-invalid.html',
    who: 'visitor',
    site: 'marketing',
  },
  'marketing-home.notify-busy': {
    app: '/',
    mock: 'pages/marketing-home/notify-busy.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-pending',
  },
  'marketing-home.notify-success': {
    app: '/',
    mock: 'pages/marketing-home/notify-success.html',
    who: 'visitor',
    site: 'marketing',
  },
  'marketing-home.notify-retrying': {
    app: '/',
    mock: 'pages/marketing-home/notify-retrying.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-failing',
  },
  'marketing-home.notify-recovered': {
    app: '/',
    mock: 'pages/marketing-home/notify-success.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-recovering',
  },
  'marketing-home.notify-rate-limited': {
    app: '/',
    mock: 'pages/marketing-home/notify-rate-limited.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-limited',
  },
  'marketing-home.notify-challenge-failed': {
    app: '/',
    mock: 'pages/marketing-home/notify-challenge-failed.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-challenge',
  },
  // The server finds a field the page let through (L2-217 AC2, L2-216 AC3): the invalid state.
  'marketing-home.notify-server-invalid': {
    app: '/',
    mock: 'pages/marketing-home/notify-invalid.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-refused-field',
  },
  'marketing-home.business-server-invalid': {
    app: '/',
    mock: 'pages/marketing-home/business-invalid.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-refused-fields',
  },
  // The send cannot be made at all (L2-217 AC6, L2-216 AC6): the still-sending state.
  'marketing-home.notify-unreachable': {
    app: '/',
    mock: 'pages/marketing-home/notify-retrying.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-notify-unreachable',
  },
  'marketing-home.business-unreachable': {
    app: '/',
    mock: 'pages/marketing-home/business-retrying.html',
    who: 'visitor',
    site: 'marketing',
    stub: 'launch-business-unreachable',
  },
} as const satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
