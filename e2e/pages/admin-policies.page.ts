import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/policies` of the admin application: the four policy pages and their published version (L2-247). */
export class AdminPoliciesPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.rows = this.main.getByRole('list', { name: 'Policies' }).locator('li');
    this.loading = this.main.getByRole('status').filter({ hasText: 'Loading the policies' });
    this.error = this.main.locator('.empty--error');
    this.reference = this.error.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  row(title: string): Locator {
    return this.rows.filter({ has: this.page.locator('.row__title', { hasText: title }) });
  }

  meta(title: string): Locator {
    return this.row(title).locator('.row__meta');
  }

  edit(title: string): Locator {
    return this.main.getByRole('link', { name: `Edit ${title}` });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
