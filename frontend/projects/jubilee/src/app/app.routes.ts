import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { ChromeSection } from 'components';
import { guestGuard } from './guards/guest.guard';
import { memberGuard } from './guards/member.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';
import { verifierGuard } from './guards/verifier.guard';
import { welcomeRedirectGuard } from './guards/welcome-redirect.guard';

/**
 * Route data drives the shell: `shell` picks the chrome (`app` with top bar, footer and tab
 * bar, or `bare`), `page` is stamped on `<body data-page>`, and `section` marks the current
 * entry of the primary navigation.
 */
export interface JbRouteData {
  shell: 'app' | 'bare';
  page: string;
  section?: ChromeSection;
}

const data = (value: JbRouteData): JbRouteData => value;

/**
 * The listing page, and the same page with a dialog open: /b/:slug/message, /book, /quote, /share or /report. One
 * route serves all three so that opening a dialog does not load the page, or count a view, again.
 */
export function businessMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments[0]?.path !== 'b' || !segments[1]) return null;
  const dialog =
    segments.length === 3 &&
    ['message', 'book', 'quote', 'share', 'report'].includes(segments[2].path);
  if (segments.length !== 2 && !dialog) return null;
  return { consumed: segments, posParams: { slug: segments[1] } };
}

/** A product page, and the same page with the order request open: /b/:slug/p/:product[/request]. */
export function productMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments[0]?.path !== 'b' || !segments[1] || segments[2]?.path !== 'p' || !segments[3]) {
    return null;
  }
  const dialog = segments.length === 5 && segments[4].path === 'request';
  if (segments.length !== 4 && !dialog) return null;
  return { consumed: segments, posParams: { slug: segments[1], product: segments[3] } };
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/browse/browse.page').then((m) => m.BrowsePage),
    data: data({ shell: 'app', page: 'browse', section: 'browse' }),
    title: 'Browse · Jubilee',
  },
  {
    path: 'welcome',
    loadComponent: () => import('./pages/welcome/welcome.page').then((m) => m.WelcomePage),
    canActivate: [welcomeRedirectGuard],
    data: data({ shell: 'app', page: 'welcome' }),
    title: 'Jubilee · Toronto’s Christian marketplace',
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.page').then((m) => m.SearchPage),
    data: data({ shell: 'app', page: 'search', section: 'browse' }),
    title: 'Search · Jubilee',
  },
  {
    path: 'c/:category',
    loadComponent: () => import('./pages/category/category.page').then((m) => m.CategoryPage),
    data: data({ shell: 'app', page: 'category', section: 'browse' }),
    title: 'Category · Jubilee',
  },
  {
    matcher: businessMatcher,
    loadComponent: () => import('./pages/business/business.page').then((m) => m.BusinessPage),
    data: data({ shell: 'app', page: 'business', section: 'browse' }),
    title: 'Business · Jubilee',
  },
  {
    matcher: productMatcher,
    loadComponent: () => import('./pages/product/product.page').then((m) => m.ProductPage),
    data: data({ shell: 'app', page: 'product', section: 'browse' }),
    title: 'Product · Jubilee',
  },
  {
    path: 'saved',
    loadComponent: () => import('./pages/saved/saved.page').then((m) => m.SavedPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'saved' }),
    title: 'Saved · Jubilee',
  },
  {
    path: 'messages',
    pathMatch: 'full',
    loadComponent: () => import('./pages/messages/messages.page').then((m) => m.MessagesPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'messages', section: 'messages' }),
    title: 'Messages · Jubilee',
  },
  {
    path: 'messages/:id',
    loadComponent: () =>
      import('./pages/conversation/conversation.page').then((m) => m.ConversationPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'conversation', section: 'messages' }),
    title: 'Conversation · Jubilee',
  },
  {
    path: 'reference/:token',
    loadComponent: () =>
      import('./pages/church-reference/church-reference.page').then((m) => m.ChurchReferencePage),
    data: data({ shell: 'bare', page: 'church-reference' }),
    title: 'Confirm a reference · Jubilee',
  },
  {
    path: 'list',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/list-business/list-business.page').then((m) => m.ListBusinessPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'list-business', section: 'business' }),
    title: 'List your business · Jubilee',
  },
  {
    path: 'requests',
    pathMatch: 'full',
    loadComponent: () => import('./pages/requests/requests.page').then((m) => m.RequestsPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'requests', section: 'account' }),
    title: 'Your requests · Jubilee',
  },
  {
    path: 'requests/:id',
    loadComponent: () =>
      import('./pages/request-detail/request-detail.page').then((m) => m.RequestDetailPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'request-detail', section: 'account' }),
    title: 'Request · Jubilee',
  },
  {
    path: 'notifications',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/notifications/notifications.page').then((m) => m.NotificationsPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'notifications', section: 'notifications' }),
    title: 'Notifications · Jubilee',
  },
  {
    path: 'my-business',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/my-business/my-business.page').then((m) => m.MyBusinessPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'my-business', section: 'business' }),
    title: 'My business · Jubilee',
  },
  {
    path: 'my-business/listing',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/edit-listing/edit-listing.page').then((m) => m.EditListingPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'edit-listing', section: 'business' }),
    title: 'Edit listing · Jubilee',
  },
  {
    path: 'my-business/products',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/my-products/my-products.page').then((m) => m.MyProductsPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'my-products', section: 'business' }),
    title: 'Products · Jubilee',
  },
  {
    path: 'my-business/services',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/my-services/my-services.page').then((m) => m.MyServicesPage),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'my-services', section: 'business' }),
    title: 'Services · Jubilee',
  },
  {
    path: 'my-business/requests',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/incoming-requests/incoming-requests.page').then(
        (m) => m.IncomingRequestsPage,
      ),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'incoming-requests', section: 'business' }),
    title: 'Requests · Jubilee',
  },
  {
    path: 'admin/verifications',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/admin-verifications/admin-verifications.page').then(
        (m) => m.AdminVerificationsPage,
      ),
    canActivate: [verifierGuard],
    data: data({ shell: 'app', page: 'admin-verifications', section: 'verifications' }),
    title: 'Verification queue · Jubilee',
  },
  {
    path: 'admin/verifications/:id',
    loadComponent: () =>
      import('./pages/admin-verification/admin-verification.page').then(
        (m) => m.AdminVerificationPage,
      ),
    canActivate: [verifierGuard],
    data: data({ shell: 'app', page: 'admin-verification', section: 'verifications' }),
    title: 'Review a listing · Jubilee',
  },
  {
    path: 'error',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/server-error/server-error.page').then((m) => m.ServerErrorPage),
    data: data({ shell: 'bare', page: 'server-error' }),
    title: 'Something went wrong · Jubilee',
  },
  {
    path: 'maintenance',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/maintenance/maintenance.page').then((m) => m.MaintenancePage),
    data: data({ shell: 'bare', page: 'maintenance' }),
    title: 'Being updated · Jubilee',
  },
  {
    path: 'offline',
    pathMatch: 'full',
    loadComponent: () => import('./pages/offline/offline.page').then((m) => m.OfflinePage),
    data: data({ shell: 'bare', page: 'offline' }),
    title: 'You’re offline · Jubilee',
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./pages/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
    data: data({ shell: 'app', page: 'forbidden' }),
    title: 'No access · Jubilee',
  },
  ...(
    [
      ['statement-of-faith', 'Statement of faith'],
      ['terms', 'Terms of use'],
      ['privacy', 'Privacy'],
    ] as const
  ).map(([slug, title]) => ({
    path: slug,
    pathMatch: 'full' as const,
    loadComponent: () => import('./pages/policy/policy.page').then((m) => m.PolicyPage),
    data: { ...data({ shell: 'app', page: slug }), slug },
    title: `${title} · Jubilee`,
  })),
  {
    path: 'help',
    pathMatch: 'full',
    loadComponent: () => import('./pages/help/help.page').then((m) => m.HelpPage),
    data: data({ shell: 'app', page: 'help' }),
    title: 'Help · Jubilee',
  },
  {
    path: 'join',
    pathMatch: 'full',
    loadComponent: () => import('./pages/join/join.page').then((m) => m.JoinPage),
    canActivate: [guestGuard],
    data: data({ shell: 'bare', page: 'sign-up' }),
    title: 'Join · Jubilee',
  },
  {
    path: 'account',
    pathMatch: 'full',
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
    canActivate: [memberGuard],
    canDeactivate: [unsavedChangesGuard],
    data: data({ shell: 'app', page: 'account', section: 'account' }),
    title: 'Your account · Jubilee',
  },
  {
    path: 'account/notifications',
    loadComponent: () =>
      import('./pages/notification-settings/notification-settings.page').then(
        (m) => m.NotificationSettingsPage,
      ),
    canActivate: [memberGuard],
    data: data({ shell: 'app', page: 'preferences', section: 'account' }),
    title: 'Notification settings · Jubilee',
  },
  {
    path: 'confirm-email-change/:token',
    loadComponent: () =>
      import('./pages/confirm-email-change/confirm-email-change.page').then(
        (m) => m.ConfirmEmailChangePage,
      ),
    data: data({ shell: 'bare', page: 'confirm-email-change' }),
    title: 'Confirm your new e-mail · Jubilee',
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
    data: data({ shell: 'bare', page: 'forgot-password' }),
    title: 'Reset your password · Jubilee',
  },
  {
    path: 'reset-password/:token',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
    data: data({ shell: 'bare', page: 'reset-password' }),
    title: 'Choose a new password · Jubilee',
  },
  {
    path: 'join/agreement',
    loadComponent: () =>
      import('./pages/join-agreement/join-agreement.page').then((m) => m.JoinAgreementPage),
    data: data({ shell: 'bare', page: 'join-agreement' }),
    title: 'One more step · Jubilee',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
    data: data({ shell: 'bare', page: 'verify-email' }),
    title: 'Confirm your e-mail · Jubilee',
  },
  {
    path: 'verify-email/:token',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
    data: data({ shell: 'bare', page: 'verify-email' }),
    title: 'Confirm your e-mail · Jubilee',
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    data: data({ shell: 'app', page: 'not-found' }),
    title: 'Page not found · Jubilee',
  },
];
