import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

export class NotFoundPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  readonly backToBrowse: Locator;
  readonly search: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.backToBrowse = this.main.getByRole('link', { name: 'Back to browse' });
    this.search = this.main.getByRole('link', { name: 'Search' });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
