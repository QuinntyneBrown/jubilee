import type { Locator, Page } from '@playwright/test';

/** The dialog that replaces an unconfirmed e-mail address, "Use another e-mail" (L2-004 AC5). */
export class ChangeUnconfirmedEmailDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly emailError: Locator;
  readonly alert: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly close: Locator;
  readonly done: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.email = this.root.getByLabel('New e-mail');
    this.password = this.root.locator('input[type="password"]');
    this.emailError = this.root.locator('#ce-email-error');
    this.alert = this.root.getByRole('alert');
    this.send = this.root.getByRole('button', { name: /^(Send confirmation link|Sending…)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.done = this.root.getByRole('button', { name: 'Done' });
  }
}
