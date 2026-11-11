import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { BusinessCard } from './business-card';
import { ShellPage } from './shell.page';

/** One product card of "From the shops". */
export class ProductCard {
  readonly name: Locator;
  readonly shopName: Locator;
  readonly price: Locator;
  readonly mediaTile: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.biz-card__name');
    this.shopName = root.locator('.biz-card__tagline');
    this.price = root.locator('.price');
    this.mediaTile = root.locator('.media');
  }
}

/** One category group of the full directory. */
export class DirectoryGroup {
  readonly heading: Locator;
  readonly count: Locator;
  readonly rows: Locator;
  readonly seeAll: Locator;

  constructor(readonly root: Locator) {
    this.heading = root.getByRole('heading', { level: 3 });
    this.count = root.locator('.dir-group__count');
    this.rows = root.locator('a.dir-row');
    this.seeAll = root.locator('a.dir-more');
  }

  rowName(index: number): Locator {
    return this.rows.nth(index).locator('.dir-row__name .truncate');
  }

  /** True when the name of a row is cut off with an ellipsis on one line. */
  async rowNameIsTruncated(index: number): Promise<boolean> {
    return this.rowName(index).evaluate((el) => el.scrollWidth > el.clientWidth);
  }

  async rowHeight(index: number): Promise<number> {
    return (await this.rows.nth(index).boundingBox())?.height ?? 0;
  }
}

export class BrowsePage extends ShellPage implements Screen {
  readonly hero: Locator;
  readonly greeting: Locator;
  readonly heading: Locator;
  readonly subline: Locator;
  readonly heroSearch: Locator;
  /** The whole search field of the hero, which a phone shows. */
  readonly heroSearchField: Locator;
  /** The row of category chips in the hero. */
  readonly categoryRow: Locator;
  readonly categoryChips: Locator;
  readonly joinPanel: Locator;
  readonly joinPanelAction: Locator;
  readonly content: Locator;
  readonly featured: Locator;
  readonly featuredCards: Locator;
  /** The grid of featured cards, the first drawn large. */
  readonly featureGrid: Locator;
  readonly shops: Locator;
  readonly productCards: Locator;
  readonly allShops: Locator;
  readonly directory: Locator;
  readonly directoryHeading: Locator;
  readonly groups: Locator;
  /** Every directory row, across the groups. */
  readonly directoryRows: Locator;
  /** The list of rows of each group. */
  readonly directoryLists: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  /** The list of rows drawn while the directory loads. */
  readonly loadingRows: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.hero = this.main.locator('section.hero');
    this.greeting = this.hero.locator('.hero__greeting');
    this.heading = this.hero.getByRole('heading', { level: 1 });
    this.subline = this.hero.locator('.hero__sub');
    this.heroSearch = this.hero.getByRole('searchbox', { name: 'Search businesses and products' });
    this.heroSearchField = this.hero.getByRole('search');
    this.categoryChips = this.hero.locator('.chip-row a.chip');
    this.categoryRow = this.hero.locator('.chip-row');
    this.content = this.main.locator('div.container.page');
    this.joinPanel = this.content.locator('div.band');
    this.joinPanelAction = this.joinPanel.getByRole('link', { name: 'Join free' });
    this.featured = this.main.getByRole('region', { name: 'Featured this week' });
    this.featuredCards = this.featured.locator('a.biz-card');
    this.featureGrid = this.featured.locator('ul.feature-grid');
    this.shops = this.main.getByRole('region', { name: 'From the shops' });
    this.productCards = this.shops.locator('a.product-card');
    this.allShops = this.shops.getByRole('link', { name: 'All shops' });
    this.directory = this.main.locator('section.section:has(.dir-groups)');
    this.directoryHeading = this.directory.getByRole('heading', { level: 2 });
    this.groups = this.directory.locator('section.dir-group');
    this.directoryRows = this.directory.locator('a.dir-row');
    this.directoryLists = this.directory.locator('ul.list');
    this.loadingStatus = this.content.getByRole('status');
    this.skeletons = this.content.locator('.skeleton');
    this.loadingRows = this.content.locator('ul.rows[aria-hidden="true"]');
    this.emptyState = this.content.locator('.empty:not(.empty--error)');
    this.errorState = this.content.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
  }

  featuredCard(index: number): BusinessCard {
    return new BusinessCard(this.featuredCards.nth(index));
  }

  productCard(index: number): ProductCard {
    return new ProductCard(this.productCards.nth(index));
  }

  group(name: string): DirectoryGroup {
    return new DirectoryGroup(this.directory.getByRole('region', { name, exact: true }));
  }

  stateAction(name: string): Locator {
    return this.content.locator('.empty__actions').getByRole('link', { name });
  }

  async searchFromHero(query: string): Promise<void> {
    await this.heroSearch.fill(query);
    await this.heroSearch.press('Enter');
  }

  async ready(): Promise<void> {
    await this.content
      .locator('.dir-groups, .empty, .skeleton')
      .first()
      .waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'hero', locator: this.hero },
      { name: 'content', locator: this.content },
    ];
  }
}
