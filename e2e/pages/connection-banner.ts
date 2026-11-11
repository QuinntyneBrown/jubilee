import type { Locator, Page } from '@playwright/test';

/** The banner under the top bar that says what is wrong with the connection (L2-121). */
export class ConnectionBannerRegion {
  readonly root: Locator;
  readonly tryAgain: Locator;
  readonly checkStatus: Locator;
  readonly dismiss: Locator;

  constructor(page: Page) {
    this.root = page.locator('div[jb-connection-banner]');
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
    this.checkStatus = this.root.getByRole('link', { name: 'Check status' });
    this.dismiss = this.root.getByRole('button', { name: 'Dismiss' });
  }
}
