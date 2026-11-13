import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/requests`: the member's bookings, quotes and orders (L2-047). */
export class RequestsPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly typeTabs: Locator;
  readonly rows: Locator;
  /** The status of each request. */
  readonly statusBadges: Locator;
  readonly empty: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;
  readonly showMore: Locator;
  readonly browse: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.typeTabs = this.main.getByRole('tablist', { name: 'Request type' });
    this.rows = this.main.locator('ul.rows > li');
    this.statusBadges = this.rows.locator('.badge');
    this.empty = this.main.locator('.empty');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status');
    this.showMore = this.main.getByRole('button', { name: 'Show more' });
    this.browse = this.main.getByRole('link', { name: 'Browse businesses' });
  }

  typeTab(name: string | RegExp): Locator {
    return this.typeTabs.getByRole('tab', { name });
  }

  row(title: string | RegExp): Locator {
    return this.rows.filter({ hasText: title });
  }

  titleLink(title: string): Locator {
    return this.main.getByRole('link', { name: title });
  }

  /** Lets time pass with the page open and nothing done. */
  async idle(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
