import { Routes } from '@angular/router';
import { ChromeSection } from 'components';
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
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    data: data({ shell: 'app', page: 'not-found' }),
    title: 'Page not found · Jubilee',
  },
];
