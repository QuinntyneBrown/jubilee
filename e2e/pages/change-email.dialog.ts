import type { Locator, Page } from '@playwright/test';

/** The dialog that changes the e-mail address (L2-014). */
export class ChangeEmailDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly sentNote: Locator;
  readonly done: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.email = this.root.getByLabel('New e-mail');
    this.password = this.root.getByLabel('Current password');
    this.emailError = this.root.locator('#ce-email-error');
    this.passwordError = this.root.locator('#ce-password-error');
    this.send = this.root.getByRole('button', { name: /^(Send confirmation link|Sending…)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.sentNote = this.root.locator('#dlg-desc');
    this.done = this.root.getByRole('button', { name: 'Done' });
  }

  async fill(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
  }
}
