import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/reports` of the admin application: the reports waiting for the Jubilee team (L2-105). */
export class AdminReportsPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly filters: Locator;
  readonly rows: Locator;
  readonly empty: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.filters = this.main.getByRole('tablist', { name: 'Report status' });
    this.rows = this.main.locator('tbody tr');
    this.empty = this.main.locator('.empty');
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  filter(name: string | RegExp): Locator {
    return this.filters.getByRole('tab', { name, exact: true });
  }

  row(text: string | RegExp): Locator {
    return this.rows.filter({ hasText: text });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
