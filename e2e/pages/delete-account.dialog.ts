import type { Locator, Page } from '@playwright/test';

/** The delete-account dialog (L2-017): names the account, counts what goes, asks for DELETE. */
export class DeleteAccountDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly consequences: Locator;
  readonly confirmation: Locator;
  readonly error: Locator;
  readonly alert: Locator;
  readonly keep: Locator;
  readonly delete: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.consequences = this.root.getByRole('listitem');
    this.confirmation = this.root.getByLabel('Type DELETE to confirm');
    this.error = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.keep = this.root.getByRole('button', { name: 'Keep my account' });
    this.delete = this.root.getByRole('button', { name: 'Delete account' });
  }
}
