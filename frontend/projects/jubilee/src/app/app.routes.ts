import { Routes } from '@angular/router';
import { ChromeSection } from 'components';
import { guestGuard } from './guards/guest.guard';
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
    path: 'b/:slug',
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
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
    canActivate: [guestGuard],
    data: data({ shell: 'bare', page: 'sign-in' }),
    title: 'Sign in · Jubilee',
  },
  {
    path: 'session-expired',
    loadComponent: () =>
      import('./pages/session-expired/session-expired.page').then((m) => m.SessionExpiredPage),
    data: data({ shell: 'bare', page: 'session-expired' }),
    title: 'Signed out · Jubilee',
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
