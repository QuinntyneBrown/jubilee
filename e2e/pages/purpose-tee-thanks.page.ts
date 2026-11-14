import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The page a buyer returns to from checkout, at /purpose-tee/thanks (L2-269). */
export class PurposeTeeThanksPage extends ShellPage implements Screen {
  readonly state: Locator;
  readonly heading: Locator;
  readonly text: Locator;
  readonly spinner: Locator;
  readonly reference: Locator;
  readonly backToBrowse: Locator;
  readonly seeTheTee: Locator;
  readonly backToTheTee: Locator;
  readonly tryAgain: Locator;
  readonly checkAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.state = this.main.locator('.empty');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.state.locator('.empty__text');
    this.spinner = this.state.locator('.spinner');
    this.reference = this.state.locator('code');
    this.backToBrowse = this.state.getByRole('link', { name: 'Back to browse' });
    this.seeTheTee = this.state.getByRole('link', { name: 'See the tee' });
    this.backToTheTee = this.state.getByRole('link', { name: 'Back to the tee' });
    this.tryAgain = this.state.getByRole('button', { name: 'Try again' });
    this.checkAgain = this.state.getByRole('button', { name: 'Check again' });
  }

  async ready(): Promise<void> {
    await this.state.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'state', locator: this.state }];
  }
}
