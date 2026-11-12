import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/verifications` of the admin application: the verification team's queue (L2-099). */
export class AdminVerificationsPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly tabsList: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.tabsList = this.main.getByRole('tablist', { name: 'Queue filter' });
    this.rows = this.main.locator('tbody tr');
    this.empty = this.main.locator('.empty');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status');
  }

  filter(name: string | RegExp): Locator {
    return this.tabsList.getByRole('tab', { name });
  }

  row(business: string): Locator {
    return this.rows.filter({ has: this.page.getByRole('link', { name: business }) });
  }

  businessLink(business: string): Locator {
    return this.main.getByRole('link', { name: business });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
