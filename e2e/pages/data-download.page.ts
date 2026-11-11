import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/account/data/:token`: the page the e-mailed link opens (L2-018). */
export class DataDownloadPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly done: Locator;
  readonly unavailable: Locator;
  readonly goToAccount: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.done = this.main.locator('.alert--success');
    this.unavailable = this.main.locator('.empty');
    this.goToAccount = this.main.getByRole('link', { name: 'Go to your account' });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
