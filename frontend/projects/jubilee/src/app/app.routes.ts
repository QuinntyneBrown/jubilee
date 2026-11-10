import { Routes } from '@angular/router';
import { ChromeSection } from 'components';

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
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
    data: data({ shell: 'app', page: 'not-found' }),
    title: 'Page not found · Jubilee',
  },
];
