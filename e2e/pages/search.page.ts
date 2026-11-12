import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';
import { SpaceCard } from './space-card';

/** The search page: results, the empty search page, no results and the load-error state. */
export class SearchPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly tablist: Locator;
  readonly tabButtons: Locator;
  readonly panel: Locator;
  readonly rows: Locator;
  /** The names of the results on show, in order. */
  readonly rowTitles: Locator;
  /** Spaces among the results, as space cards (L2-204). */
  readonly spaceCards: Locator;
  readonly marks: Locator;
  readonly emptyState: Locator;
  readonly emptyTitle: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  readonly backToBrowse: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  readonly pageSearchBox: Locator;
  /** The whole search field of the page before a search. */
  readonly pageSearchField: Locator;
  readonly recentSection: Locator;
  readonly recentChips: Locator;
  readonly clearRecent: Locator;
  readonly popularSection: Locator;
  readonly popularChips: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-header .subtitle');
    this.tablist = this.main.getByRole('tablist', { name: 'Result type' });
    this.tabButtons = this.tablist.getByRole('tab');
    this.panel = this.main.getByRole('tabpanel');
    this.rows = this.panel.locator('li.row');
    this.rowTitles = this.rows.locator('.row__title');
    this.spaceCards = this.panel.locator('ul.card-grid a.space-card');
    this.marks = this.rows.locator('mark');
    this.emptyState = this.main.locator('.empty:not(.empty--error)');
    this.emptyTitle = this.emptyState.locator('.empty__title');
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
    this.backToBrowse = this.errorState.getByRole('link', { name: 'Back to browse' });
    this.loadingStatus = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.pageSearchBox = this.main.getByRole('searchbox', { name: 'Search Jubilee' });
    this.pageSearchField = this.main.getByRole('search');
    this.recentSection = this.main.getByRole('region', { name: 'Your recent searches' });
    this.recentChips = this.recentSection.locator('a.chip');
    this.clearRecent = this.recentSection.getByRole('button', { name: 'Clear recent searches' });
    this.popularSection = this.main.getByRole('region', { name: 'Popular categories' });
    this.popularChips = this.popularSection.locator('a.chip');
  }

  tab(name: string): Locator {
    return this.tablist.getByRole('tab', { name: new RegExp(`^${name}`) });
  }

  spaceCard(index: number): SpaceCard {
    return new SpaceCard(this.spaceCards.nth(index));
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  rowTitle(index: number): Locator {
    return this.row(index).locator('.row__title');
  }

  rowMeta(index: number): Locator {
    return this.row(index).locator('.row__meta');
  }

  removeRecent(query: string): Locator {
    return this.recentSection.getByRole('button', {
      name: `Remove “${query}” from recent searches`,
    });
  }

  stateAction(name: string | RegExp): Locator {
    return this.emptyState.locator('.empty__actions').getByRole('link', { name });
  }

  async searchFromTopBar(query: string): Promise<void> {
    await this.searchBox.fill(query);
    await this.searchBox.press('Enter');
  }

  async ready(): Promise<void> {
    await this.main
      .locator('li.row, a.space-card, .empty, .skeleton, .chip-row')
      .first()
      .waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
