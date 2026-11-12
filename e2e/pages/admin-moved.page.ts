import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The app's `/admin/**`: the verification team's screens have moved to the admin application (L2-194). */
export class AdminMovedPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  readonly openAdmin: Locator;
  readonly backToBrowse: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.statusPage.getByRole('heading', { level: 1 });
    this.text = this.statusPage.locator('.empty__text');
    this.openAdmin = this.statusPage.getByRole('link', { name: 'Open the admin application' });
    this.backToBrowse = this.statusPage.getByRole('link', { name: 'Back to browse' });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
