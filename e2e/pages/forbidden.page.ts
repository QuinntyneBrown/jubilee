import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/forbidden`: a signed-in member opened an area that is not theirs (L2-098 AC1). */
export class ForbiddenPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  readonly backToBrowse: Locator;
  readonly askForAccess: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.backToBrowse = this.main.getByRole('link', { name: 'Back to browse' });
    this.askForAccess = this.main.getByRole('link', { name: 'Ask for access' });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
