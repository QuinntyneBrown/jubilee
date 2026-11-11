import type { Locator, Page } from '@playwright/test';

/** `/maintenance`: Jubilee is being updated (L2-117). */
export class MaintenancePage {
  readonly heading: Locator;
  readonly text: Locator;
  readonly checkAgain: Locator;
  private readonly main: Locator;

  constructor(page: Page) {
    this.main = page.locator('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.checkAgain = this.main.getByRole('button', { name: 'Check again' });
  }
}
