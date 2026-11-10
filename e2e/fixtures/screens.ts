import type { Page } from '@playwright/test';
import { BrowsePage } from '../pages/browse.page';
import { NotFoundPage } from '../pages/not-found.page';
import { WelcomePage } from '../pages/welcome.page';
import type { RouteKey } from './routes';
import type { Screen } from './visual';

/** Every screen state of the journey with the page object that knows its parts. */
export const screens: { key: RouteKey; screen: (page: Page) => Screen }[] = [
  { key: 'welcome', screen: (page) => new WelcomePage(page) },
  { key: 'browse', screen: (page) => new BrowsePage(page) },
  { key: 'browse.signed-out', screen: (page) => new BrowsePage(page) },
  { key: 'browse.loading', screen: (page) => new BrowsePage(page) },
  { key: 'browse.empty', screen: (page) => new BrowsePage(page) },
  { key: 'browse.error', screen: (page) => new BrowsePage(page) },
  { key: 'browse.edge', screen: (page) => new BrowsePage(page) },
  { key: 'not-found', screen: (page) => new NotFoundPage(page) },
];
