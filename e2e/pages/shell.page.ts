import type { Locator, Page } from '@playwright/test';
import type { Region } from '../fixtures/visual';

/** The chrome around every app page: skip link, top bar, footer and phone tab bar. */
export class ShellPage {
  readonly skipLink: Locator;
  readonly main: Locator;
  /** The title block of the page: its heading, its subtitle and its actions. */
  readonly pageHeader: Locator;
  /** The head of each titled section: its heading and the action beside it. */
  readonly sectionHeads: Locator;
  /** The whole of a page that only says why it has nothing to show. */
  readonly statusPage: Locator;
  /** The lists of labels and values in the page. */
  readonly descriptionLists: Locator;
  /** The framed tables in the page. */
  readonly tables: Locator;
  /** The grids of business and product cards in the page. */
  readonly cardGrids: Locator;
  readonly topBar: Locator;
  readonly brand: Locator;
  readonly primaryNav: Locator;
  readonly searchBox: Locator;
  /** The whole search field of the top bar: its icon and its box. */
  readonly searchField: Locator;
  readonly searchLink: Locator;
  readonly notifications: Locator;
  readonly avatar: Locator;
  readonly footer: Locator;
  readonly tabBar: Locator;
  /** The way into the feedback panel, at the bottom right of every member screen (L2-210). */
  readonly feedbackLauncher: Locator;
  /** The word in the launcher, which a phone hides. */
  readonly feedbackLauncherLabel: Locator;
  /** The banner between the top bar and the page: verify e-mail, or the connection. */
  readonly chromeBanner: Locator;
  /** The frame of a page on the bare shell: its brand link, its card and the line under it. */
  readonly frameBrand: Locator;
  readonly frameCard: Locator;
  readonly frameFoot: Locator;

  constructor(protected readonly page: Page) {
    this.skipLink = page.locator('a.skip-link');
    this.main = page.locator('main#main');
    this.pageHeader = this.main.locator('.page-header');
    this.sectionHeads = this.main.locator('.section-head');
    this.statusPage = this.main.locator('.status-page');
    this.descriptionLists = this.main.locator('dl.dl');
    this.tables = this.main.locator('.table-wrap');
    this.cardGrids = this.main.locator('ul.card-grid');
    this.topBar = page.locator('header.topbar');
    this.brand = this.topBar.locator('.topbar__brand');
    this.primaryNav = this.topBar.getByRole('navigation', { name: 'Primary', exact: true });
    this.searchBox = this.topBar.getByRole('searchbox', { name: 'Search businesses and products' });
    this.searchField = this.topBar.getByRole('search');
    this.searchLink = this.topBar.getByRole('link', { name: 'Search', exact: true });
    this.notifications = this.topBar.getByRole('link', { name: /^Notifications/ });
    this.avatar = this.topBar.locator('.avatar');
    this.footer = page.locator('footer.footer');
    this.tabBar = page.getByRole('navigation', { name: 'Primary, phone' });
    this.feedbackLauncher = page.locator('button.feedback-launcher');
    this.feedbackLauncherLabel = this.feedbackLauncher.locator('.feedback-launcher__label');
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

  async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Space between the footer and the bottom of the page, in CSS px, not counting what the
   * page reserves for the tab bar. The page is never shorter than the viewport.
   */
  async spaceBelowFooter(): Promise<number> {
    return this.footer.evaluate((footer) => {
      const root = document.documentElement;
      const pageBottom = Math.max(root.scrollHeight, root.clientHeight);
      const reserved = parseFloat(getComputedStyle(document.body).paddingBottom);
      const footerBottom = footer.getBoundingClientRect().bottom + window.scrollY;
      return pageBottom - reserved - footerBottom;
    });
  }

  /** True when the page is taller than the viewport, i.e. it scrolls. */
  async scrollsVertically(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
    );
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

  /** Whether a region runs with the text around it, as a word does, rather than as a box. */
  flowsInline(region: Locator): Promise<boolean> {
    return region.evaluate((element) => getComputedStyle(element).display === 'inline');
  }

  private async boxOf(
    region: Locator,
  ): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await region.boundingBox();
    if (!box) throw new Error('The region is not on screen.');
    return box;
  }

  /** The drafts this device keeps (L2-116 AC4): what the app wrote to the browser's storage. */
  keptDrafts(): Promise<{ owner: string; address: string; key: string; values: unknown }[]> {
    return this.page.evaluate(() => JSON.parse(localStorage.getItem('jubilee-drafts') ?? '[]'));
  }

  dataPage(): Promise<string | null> {
    return this.page.locator('body').getAttribute('data-page');
  }
}
