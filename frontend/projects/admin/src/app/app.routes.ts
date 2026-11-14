import { Routes } from '@angular/router';
import { signedOutGuard, staffGuard } from './guards/staff.guard';
import { BarePage } from './pages/bare/bare.page';
import { ShellPage } from './pages/shell/shell.page';

/**
 * The data every route of the admin application carries: `shell` picks the chrome (the shell of
 * L2-272, or the sign-in frame), `page` is stamped on `<body data-page>`, `current` is the table
 * the sidebar marks when the path does not name one (`/:table` does), and `role` is the staff role
 * the screen needs: `moderator` for the Jubilee team's screens (L2-188 AC4), `admin` for the
 * policies (L2-247 AC10).
 */
export interface AdminRouteData {
  shell: 'admin' | 'bare';
  page: string;
  current?: string;
  role?: StaffRole;
}

export type SignInState = 'sign-in' | 'signed-out' | 'session-expired';

const data = (value: AdminRouteData & { state?: SignInState }) => value;

export type StaffRole = 'moderator' | 'admin';

const screen = (page: string, current: string, role: StaffRole = 'moderator') =>
  data({ shell: 'admin', page, current, role });

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'listings' },
  {
    // The sign-in frame (L2-189): no shell, only the screen in `main`.
    path: '',
    component: BarePage,
    children: [
      {
        path: 'sign-in',
        canActivate: [signedOutGuard],
        loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
        data: data({ shell: 'bare', page: 'admin-sign-in', state: 'sign-in' }),
        title: 'Sign in · Jubilee admin',
      },
      {
        path: 'signed-out',
        canActivate: [signedOutGuard],
        loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
        data: data({ shell: 'bare', page: 'admin-sign-in', state: 'signed-out' }),
        title: 'Signed out · Jubilee admin',
      },
      {
        path: 'session-expired',
        canActivate: [signedOutGuard],
        loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
        data: data({ shell: 'bare', page: 'admin-sign-in', state: 'session-expired' }),
        title: 'Session ended · Jubilee admin',
      },
    ],
  },
  {
    // Every other screen sits in the shell of L2-272.
    path: '',
    component: ShellPage,
    canActivateChild: [staffGuard],
    children: [
      {
        path: 'listings/:id',
        loadComponent: () =>
          import('./pages/admin-listing/admin-listing.page').then((m) => m.AdminListingPage),
        data: screen('admin-listing', 'listings'),
        title: 'A listing · Jubilee admin',
      },
      {
        path: 'reports',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin-reports/admin-reports.page').then((m) => m.AdminReportsPage),
        data: screen('admin-reports', 'listing-reports'),
        title: 'Reports · Jubilee admin',
      },
      {
        path: 'reports/:id',
        loadComponent: () =>
          import('./pages/admin-report/admin-report.page').then((m) => m.AdminReportPage),
        data: screen('admin-report', 'listing-reports'),
        title: 'Review a report · Jubilee admin',
      },
      {
        path: 'featured',
        loadComponent: () =>
          import('./pages/admin-featured/admin-featured.page').then((m) => m.AdminFeaturedPage),
        data: screen('admin-featured', 'featured-slots'),
        title: 'Featured this week · Jubilee admin',
      },
      {
        path: 'policies',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/admin-policies/admin-policies.page').then((m) => m.AdminPoliciesPage),
        data: screen('admin-policies', 'content-versions', 'admin'),
        title: 'Policies · Jubilee admin',
      },
      {
        path: 'policies/:slug',
        loadComponent: () =>
          import('./pages/admin-policy/admin-policy.page').then((m) => m.AdminPolicyPage),
        data: screen('admin-policy', 'content-versions', 'admin'),
        title: 'Edit a policy · Jubilee admin',
      },
      {
        // Any table of the catalog (L2-276, ADR 0074); the page says when it is not for the role
        // or does not exist.
        path: ':table',
        loadComponent: () => import('./pages/records/records.page').then((m) => m.RecordsPage),
        data: data({ shell: 'admin', page: 'admin-records' }),
        title: 'Tables · Jubilee admin',
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
        data: data({ shell: 'admin', page: 'admin-not-found' }),
        title: 'Page not found · Jubilee admin',
      },
    ],
  },
];
