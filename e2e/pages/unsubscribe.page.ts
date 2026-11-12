import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/unsubscribe/:token`: opens the link in the footer of a notification e-mail (L2-224). */
export class UnsubscribePage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  /** The outcome, announced politely. */
  readonly status: Locator;
  readonly settings: Locator;
  readonly browse: Locator;
  readonly errorState: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.status = this.main.getByRole('status');
    this.settings = this.main.getByRole('link', { name: 'Notification settings' });
    this.browse = this.main.getByRole('link', { name: 'Browse businesses' });
    this.errorState = this.main.getByRole('alert');
    this.reference = this.errorState.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  async ready(): Promise<void> {
    await this.main.locator('h1').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}
