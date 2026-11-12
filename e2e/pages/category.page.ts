import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { BusinessCard } from './business-card';
import { SpaceCard, TermFilter } from './space-card';
import { FiltersDialog } from './filters.dialog';
import { ShellPage } from './shell.page';

export class CategoryPage extends ShellPage implements Screen {
  readonly breadcrumb: Locator;
  readonly breadcrumbItems: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly toolbar: Locator;
  readonly filterChips: Locator;
  readonly chips: Locator;
  readonly filtersButton: Locator;
  readonly sort: Locator;
  readonly cards: Locator;
  readonly showing: Locator;
  readonly pagination: Locator;
  readonly pageLinks: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly loadingStatus: Locator;
  readonly skeletons: Locator;
  /** The cards drawn while the category loads. */
  readonly loadingCards: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  readonly filters: FiltersDialog;
  /** Rooms & rentals (L2-202): the term filter, the space cards and the closing call to list. */
  readonly termFilter: TermFilter;
  readonly spaceCards: Locator;
  readonly loadingSpaceCards: Locator;
  readonly spare: Locator;
  readonly listASpace: Locator;

  constructor(page: Page) {
    super(page);
    this.breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });
    this.breadcrumbItems = this.breadcrumb.locator('li');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-header .subtitle');
    this.toolbar = this.main.locator('.cluster--between').first();
    this.filterChips = this.main.getByRole('group', { name: 'Filters' });
    this.chips = this.filterChips.locator('button.chip');
    this.filtersButton = this.main.getByRole('button', { name: /^Filters/ });
    this.sort = this.main.getByLabel('Sort');
    this.cards = this.main.locator('ul.card-grid a.biz-card');
    this.showing = this.main.locator('.text-caption');
    this.pagination = this.main.getByRole('navigation', { name: 'Pagination' });
    this.pageLinks = this.pagination.locator('.pagination > li');
    this.previous = this.pagination.getByRole('link', { name: 'Previous page' });
    this.next = this.pagination.getByRole('link', { name: 'Next page' });
    this.loadingStatus = this.main.getByRole('status');
    this.skeletons = this.main.locator('.skeleton');
    this.loadingCards = this.main.locator('ul.card-grid > li.biz-card:has(.skeleton)');
    this.emptyState = this.main.locator('.empty:not(.empty--error)');
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.errorState.getByRole('button', { name: 'Try again' });
    this.filters = new FiltersDialog(page);
    this.termFilter = new TermFilter(this.main.getByRole('group', { name: 'Length of stay' }));
    this.spaceCards = this.main.locator('ul.card-grid a.space-card');
    this.loadingSpaceCards = this.main.locator('ul.card-grid[aria-hidden="true"] > li');
    this.spare = this.main.getByRole('region', { name: 'Have a spare room, suite or hall?' });
    this.listASpace = this.spare.getByRole('link', { name: 'List a space' });
  }

  chip(name: string): Locator {
    return this.filterChips.getByRole('button', { name, exact: true });
  }

  card(index: number): BusinessCard {
    return new BusinessCard(this.cards.nth(index));
  }

  spaceCard(index: number): SpaceCard {
    return new SpaceCard(this.spaceCards.nth(index));
  }

  cardNames(): Locator {
    return this.cards.locator('.biz-card__name');
  }

  pageLink(number: number): Locator {
    return this.pagination.getByRole('link', { name: `${number}`, exact: true });
  }

  stateAction(name: string | RegExp): Locator {
    return this.main.locator('.empty__actions').getByRole('link', { name });
  }

  stateButton(name: string | RegExp): Locator {
    return this.main.locator('.empty__actions').getByRole('button', { name });
  }

  async sortBy(label: 'Recommended' | 'Newest' | 'Name A–Z'): Promise<void> {
    await this.sort.selectOption({ label });
  }

  async openFilters(): Promise<void> {
    await this.filtersButton.click();
    await this.filters.panel.waitFor();
  }

  async ready(): Promise<void> {
    await this.main
      .locator('ul.card-grid a.biz-card, ul.card-grid a.space-card, .empty, .skeleton')
      .first()
      .waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}

/** The category page with the filters sheet open over it. */
export class CategoryFiltersScreen extends CategoryPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (!(await this.filters.panel.isVisible())) await this.openFilters();
    await this.filters.show.getByText(/\d/).waitFor();
    // The sheet slides in; measure and capture it at rest.
    await this.filters.panel.evaluate((panel) =>
      Promise.all(panel.getAnimations().map((animation) => animation.finished)),
    );
  }

  override regions(): Region[] {
    return [{ name: 'panel', locator: this.filters.panel }];
  }
}
