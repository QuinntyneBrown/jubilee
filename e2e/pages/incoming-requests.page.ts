import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/my-business/requests`: the owner's incoming requests (L2-051). */
export class IncomingRequestsPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly statusTabs: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;
  readonly shareListing: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.statusTabs = this.main.getByRole('tablist', { name: 'Request status' });
    this.rows = this.main.locator('ul.rows > li');
    this.empty = this.main.locator('.empty');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status');
    this.shareListing = this.main.getByRole('link', { name: 'Share your listing' });
  }

  statusTab(name: string | RegExp): Locator {
    return this.statusTabs.getByRole('tab', { name });
  }

  /** The row of a customer's request. */
  row(customer: string): Locator {
    return this.rows.filter({ hasText: customer });
  }

  confirmButton(customer: string): Locator {
    return this.main.getByRole('button', { name: `Confirm request from ${customer}` });
  }

  declineButton(customer: string): Locator {
    return this.main.getByRole('button', { name: `Decline request from ${customer}` });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
