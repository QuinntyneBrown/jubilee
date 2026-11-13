import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/listings` of the admin application: every published listing, newest first (L2-099). */
export class AdminListingsPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly search: Locator;
  /** The table's column headings, in order. */
  readonly columns: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly refresh: Locator;
  readonly clearSearch: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.search = this.main.getByRole('searchbox', { name: 'Search listings by name' });
    this.columns = this.main.getByRole('columnheader');
    this.rows = this.main.locator('tbody tr');
    this.empty = this.main.locator('.empty');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.refresh = this.main.getByRole('button', { name: 'Refresh' });
    this.clearSearch = this.main.getByRole('button', { name: 'Clear search' });
  }

  row(business: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name: business, exact: true }) });
  }

  cells(business: string): Locator {
    return this.row(business).getByRole('cell');
  }

  businessLink(business: string): Locator {
    return this.main.getByRole('link', { name: business, exact: true });
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
    await this.search.press('Enter');
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
