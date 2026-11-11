import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { ChromeSection } from 'components';
import { guestGuard } from './guards/guest.guard';
import { memberGuard } from './guards/member.guard';
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
 * The listing page, and the same page with the message dialog open: /b/:slug/message. One
 * route serves both so that opening the dialog does not load the page, or count a view, again.
 */
export function businessMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  if (segments[0]?.path !== 'b' || !segments[1]) return null;
  const message = segments.length === 3 && segments[2].path === 'message';
  if (segments.length !== 2 && !message) return null;
  return { consumed: segments, posParams: { slug: segments[1] } };
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
    path: 'b/:slug/p/:product',
    loadComponent: () => import('./pages/product/product.page').then((m) => m.ProductPage),
    data: data({ shell: 'app', page: 'product', section: 'browse' }),
    title: 'Product · Jubilee',
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
    path: 'join',
    pathMatch: 'full',
    loadComponent: () => import('./pages/join/join.page').then((m) => m.JoinPage),
    canActivate: [guestGuard],
    data: data({ shell: 'bare', page: 'sign-up' }),
    title: 'Join · Jubilee',
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
