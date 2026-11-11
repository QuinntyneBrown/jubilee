import type { Locator, Page } from '@playwright/test';

/** The banner under the top bar that says what is wrong with the connection (L2-121). */
export class ConnectionBannerRegion {
  readonly root: Locator;
  readonly tryAgain: Locator;
  readonly checkStatus: Locator;
  readonly dismiss: Locator;

  constructor(page: Page) {
    // The component's host holds the banner, a jb-alert.
    this.root = page.locator('div[jb-connection-banner] > .alert');
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
    this.checkStatus = this.root.getByRole('link', { name: 'Check status' });
    this.dismiss = this.root.getByRole('button', { name: 'Dismiss' });
  }
}
