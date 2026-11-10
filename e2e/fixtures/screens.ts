import type { Page } from '@playwright/test';
import { BrowsePage } from '../pages/browse.page';
import { BusinessLoadingScreen, BusinessPage } from '../pages/business.page';
import { CategoryFiltersScreen, CategoryPage } from '../pages/category.page';
import { NotFoundPage } from '../pages/not-found.page';
import {
  ProductInvalidScreen,
  ProductLoadingScreen,
  ProductPage,
  ProductWithSizeScreen,
} from '../pages/product.page';
import { WelcomePage } from '../pages/welcome.page';
import type { RouteKey } from './routes';
import type { Screen } from './visual';

/** Every screen state of the journey with the page object that knows its parts. */
export const screens: {
  key: RouteKey;
  screen: (page: Page) => Screen;
  /** The widths at which the screen exists, when it is not all of them. */
  below?: number;
}[] = [
  { key: 'welcome', screen: (page) => new WelcomePage(page) },
  { key: 'browse', screen: (page) => new BrowsePage(page) },
  { key: 'browse.signed-out', screen: (page) => new BrowsePage(page) },
  { key: 'browse.loading', screen: (page) => new BrowsePage(page) },
  { key: 'browse.empty', screen: (page) => new BrowsePage(page) },
  { key: 'browse.error', screen: (page) => new BrowsePage(page) },
  { key: 'browse.edge', screen: (page) => new BrowsePage(page) },
  { key: 'category', screen: (page) => new CategoryPage(page) },
  { key: 'category.loading', screen: (page) => new CategoryPage(page) },
  { key: 'category.empty', screen: (page) => new CategoryPage(page) },
  { key: 'category.error', screen: (page) => new CategoryPage(page) },
  { key: 'category.no-results', screen: (page) => new CategoryPage(page) },
  { key: 'category.long', screen: (page) => new CategoryPage(page) },
  // The filters sheet is the under-768 px form of the filters.
  { key: 'filters', screen: (page) => new CategoryFiltersScreen(page), below: 768 },
  { key: 'business', screen: (page) => new BusinessPage(page) },
  { key: 'business.loading', screen: (page) => new BusinessLoadingScreen(page) },
  { key: 'business.error', screen: (page) => new BusinessPage(page) },
  { key: 'business.empty', screen: (page) => new BusinessPage(page) },
  { key: 'business.edge', screen: (page) => new BusinessPage(page) },
  { key: 'shop', screen: (page) => new BusinessPage(page) },
  { key: 'shop.loading', screen: (page) => new BusinessLoadingScreen(page) },
  { key: 'shop.error', screen: (page) => new BusinessPage(page) },
  { key: 'shop.empty', screen: (page) => new BusinessPage(page) },
  { key: 'product', screen: (page) => new ProductWithSizeScreen(page) },
  { key: 'product.invalid', screen: (page) => new ProductInvalidScreen(page) },
  { key: 'product.loading', screen: (page) => new ProductLoadingScreen(page) },
  { key: 'product.error', screen: (page) => new ProductPage(page) },
  { key: 'product.sold-out', screen: (page) => new ProductPage(page) },
  { key: 'product.alert-requested', screen: (page) => new ProductPage(page) },
  { key: 'not-found', screen: (page) => new NotFoundPage(page) },
];
