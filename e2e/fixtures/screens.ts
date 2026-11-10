import type { Page } from '@playwright/test';
import { NotFoundPage } from '../pages/not-found.page';
import type { RouteKey } from './routes';
import type { Screen } from './visual';

/** Every screen state of the journey with the page object that knows its parts. */
export const screens: { key: RouteKey; screen: (page: Page) => Screen }[] = [
  { key: 'not-found', screen: (page) => new NotFoundPage(page) },
];
