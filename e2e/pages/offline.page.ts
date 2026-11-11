import type { Locator, Page } from '@playwright/test';

/** `/offline`: the page that replaces one that cannot load without a connection (L2-122). */
export class OfflinePage {
  readonly heading: Locator;
  readonly text: Locator;
  readonly tryAgain: Locator;
  readonly openMessages: Locator;
  private readonly main: Locator;

  constructor(page: Page) {
    this.main = page.locator('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.openMessages = this.main.getByRole('link', { name: 'Open messages' });
  }
}
