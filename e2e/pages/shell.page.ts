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
  /** The banner between the top bar and the page: verify e-mail, or the connection. */
  readonly chromeBanner: Locator;
  /** The frame of a page on the bare shell: its brand link, its card and the line under it. */
  readonly frameBrand: Locator;
  readonly frameCard: Locator;
  readonly frameFoot: Locator;

  constructor(protected readonly page: Page) {
    this.skipLink = page.locator('a.skip-link');
    this.main = page.locator('main#main');
    this.topBar = page.locator('header.topbar');
    this.brand = this.topBar.locator('.topbar__brand');
    this.primaryNav = this.topBar.getByRole('navigation', { name: 'Primary', exact: true });
    this.searchBox = this.topBar.getByRole('searchbox', { name: 'Search businesses and products' });
    this.searchLink = this.topBar.getByRole('link', { name: 'Search', exact: true });
    this.notifications = this.topBar.getByRole('link', { name: /^Notifications/ });
    this.avatar = this.topBar.locator('.avatar');
    this.footer = page.locator('footer.footer');
    this.tabBar = page.getByRole('navigation', { name: 'Primary, phone' });
    this.chromeBanner = page.locator('.alert.banner');
    this.frameBrand = this.main.locator('.auth-brand');
    this.frameCard = this.main.locator('.auth-card');
    this.frameFoot = this.main.locator('.auth-foot');
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

  /**
   * The primary controls on screen (buttons, chips, tab bar items, list rows) that are smaller
   * than the given size in either direction, as "label widthxheight" (L2-162).
   */
  async primaryControlsSmallerThan(size: number): Promise<string[]> {
    return this.page.evaluate((min) => {
      const controls = document.querySelectorAll<HTMLElement>(
        '.btn, .chip, .tabbar__item, .dir-row',
      );
      return [...controls]
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0)
        .filter(({ box }) => box.width < min || box.height < min)
        .map(
          ({ el, box }) =>
            `${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim()} ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
    }, size);
  }

  /** Links and buttons on screen that are smaller than 24 px in both directions (WCAG 2.5.8). */
  async targetsSmallerThanMinimum(): Promise<string[]> {
    return this.page.evaluate(() =>
      // A box inside a label is reached through the label, which is the target.
      [...document.querySelectorAll<HTMLElement>('a[href], button, select, input:not(label input)')]
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.width > 0 && box.height > 0)
        .filter(({ box }) => box.width < 24 && box.height < 24)
        .map(({ el, box }) => `${el.textContent?.trim()} ${box.width}x${box.height}`),
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

  /** The edges of a region in the viewport, in CSS pixels, for a layout that a width decides. */
  async leftEdge(region: Locator): Promise<number> {
    return (await this.boxOf(region)).x;
  }

  async rightEdge(region: Locator): Promise<number> {
    const box = await this.boxOf(region);
    return box.x + box.width;
  }

  async topEdge(region: Locator): Promise<number> {
    return (await this.boxOf(region)).y;
  }

  async bottomEdge(region: Locator): Promise<number> {
    const box = await this.boxOf(region);
    return box.y + box.height;
  }

  private async boxOf(
    region: Locator,
  ): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await region.boundingBox();
    if (!box) throw new Error('The region is not on screen.');
    return box;
  }

  dataPage(): Promise<string | null> {
    return this.page.locator('body').getAttribute('data-page');
  }
}
