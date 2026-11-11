import type { Locator, Page } from '@playwright/test';

/** The pause dialog (L2-096): the owner hides the listing until they resume it. */
export class PauseListingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly keep: Locator;
  readonly pause: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.keep = this.root.getByRole('button', { name: 'Keep it live' });
    this.pause = this.root.getByRole('button', { name: 'Pause listing' });
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
  }
}
