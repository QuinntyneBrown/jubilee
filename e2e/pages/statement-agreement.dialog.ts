import type { Locator, Page } from '@playwright/test';

/** "The statement of faith has been updated" (L2-075 AC3 to AC6): the owner reads it and agrees. */
export class StatementAgreementDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly read: Locator;
  readonly notNow: Locator;
  readonly agree: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'The statement of faith has been updated' });
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.read = this.root.getByRole('link', { name: 'Read the statement of faith' });
    this.notNow = this.root.getByRole('button', { name: 'Not now' });
    this.agree = this.root.getByRole('button', { name: 'I agree' });
    this.close = this.root.getByRole('button', { name: 'Close' });
  }
}
