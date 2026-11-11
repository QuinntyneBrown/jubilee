import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/confirm-email-change/:token`: opens the link sent to the new address (L2-014). */
export class ConfirmEmailChangePage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  readonly account: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.account = this.main.getByRole('link', { name: /account|e-mail again|another e-mail/i });
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-VERIFY-502' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  async ready(): Promise<void> {
    await this.main.locator('h1').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}
