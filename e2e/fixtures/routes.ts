/**
 * Every screen state the suite opens, keyed once so one spec serves both targets:
 * the Angular app (`app` path plus the scenario that produces the state) and the
 * design reference (`mock` file under docs/mocks, opened when JB_BASELINE=1).
 */
export type Who = 'visitor' | 'member';

/** Names a data stub in `fixtures/stubs.ts`; absent means the real, seeded API answers. */
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
  | 'business-edge';

export interface ScreenRoute {
  app: string;
  mock: string;
  who: Who;
  stub?: StubName;
}

export const routes = {
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
  'not-found': { app: '/no-such-page', mock: 'pages/not-found/default.html', who: 'member' },
} as const satisfies Record<string, ScreenRoute>;

export type RouteKey = keyof typeof routes;
