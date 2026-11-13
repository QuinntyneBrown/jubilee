import type { Locator, Page } from '@playwright/test';

/** "Take down listing" (L2-101): takes a listing off Jubilee with a reason for its owner. */
export class TakeDownListingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly reason: Locator;
  readonly hint: Locator;
  readonly error: Locator;
  readonly alert: Locator;
  readonly keep: Locator;
  readonly takeDown: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('.dialog__desc');
    this.reason = this.root.getByRole('textbox', { name: /Reason for/ });
    this.hint = this.root.locator('.field__help');
    this.error = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.keep = this.root.getByRole('button', { name: 'Keep it' });
    this.takeDown = this.root.getByRole('button', { name: 'Take down listing' });
  }
}
