import type { Locator, Page } from '@playwright/test';

/** The cancel dialog (L2-049): the member cancels an open request. */
export class CancelRequestDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly keep: Locator;
  readonly cancel: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.keep = this.root.getByRole('button', { name: 'Keep request' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel request' });
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
  }
}
