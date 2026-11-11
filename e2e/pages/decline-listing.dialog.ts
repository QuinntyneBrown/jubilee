import type { Locator, Page } from '@playwright/test';

/** The decline dialog (L2-104): closes a listing with a reason for the owner. */
export class DeclineListingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly reason: Locator;
  readonly error: Locator;
  readonly alert: Locator;
  readonly cancel: Locator;
  readonly decline: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.reason = this.root.getByRole('textbox', { name: /Reason for/ });
    this.error = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.decline = this.root.getByRole('button', { name: 'Decline listing' });
  }
}
