import type { Locator, Page } from '@playwright/test';
import type { Region } from '../fixtures/visual';

/** The chrome around every app page: skip link, top bar, footer and phone tab bar. */
export class ShellPage {
  readonly skipLink: Locator;
  readonly main: Locator;
  readonly topBar: Locator;
  readonly brand: Locator;
  readonly primaryNav: Locator;
  readonly searchBox: Locator;
  readonly searchLink: Locator;
  readonly notifications: Locator;
  readonly avatar: Locator;
  readonly footer: Locator;
  readonly tabBar: Locator;

  constructor(protected readonly page: Page) {
    this.skipLink = page.locator('a.skip-link');
    this.main = page.locator('main#main');
    this.topBar = page.locator('header.topbar');
    this.brand = this.topBar.locator('.topbar__brand');
    this.primaryNav = this.topBar.getByRole('navigation', { name: 'Primary', exact: true });
    this.searchBox = this.topBar.getByRole('searchbox', { name: 'Search businesses and products' });
    this.searchLink = this.topBar.getByRole('link', { name: 'Search', exact: true });
    this.notifications = this.topBar.getByRole('link', { name: /^Notifications/ });
    this.avatar = this.topBar.locator('a.avatar');
    this.footer = page.locator('footer.footer');
    this.tabBar = page.getByRole('navigation', { name: 'Primary, phone' });
  }

  /** The chrome's parts, for the visual sweep; the tab bar shows under 768 px only. */
  chromeRegions(): Region[] {
    return [
      { name: 'top-bar', locator: this.topBar },
      { name: 'footer', locator: this.footer },
      { name: 'tab-bar', locator: this.tabBar, below: 768 },
    ];
  }

  /** A link of the top bar, wherever it sits (navigation or action button). */
  topBarLink(name: string | RegExp): Locator {
    return this.topBar.getByRole('link', { name });
  }

  tab(name: string | RegExp): Locator {
    return this.tabBar.getByRole('link', { name });
  }

  tabs(): Locator {
    return this.tabBar.getByRole('link');
  }

  footerLink(name: string): Locator {
    return this.footer.getByRole('link', { name, exact: true });
  }

  /** The unread badge inside a navigation entry. */
  badgeIn(entry: Locator): Locator {
    return entry.locator('.badge--count');
  }

  async setWidth(width: number): Promise<void> {
    await this.page.setViewportSize({ width, height: 800 });
  }

  /** Space the page keeps free at the bottom, in CSS px. */
  async reservedBottomSpace(): Promise<number> {
    return this.page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
  }

  /** True when the page is wider than the viewport, i.e. it scrolls sideways. */
  async overflowsHorizontally(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  focused(): Locator {
    return this.page.locator(':focus');
  }

  dataPage(): Promise<string | null> {
    return this.page.locator('body').getAttribute('data-page');
  }
}
