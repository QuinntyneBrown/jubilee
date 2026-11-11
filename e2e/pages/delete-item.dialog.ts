import type { Locator, Page } from '@playwright/test';

/** The delete confirmation for a product or a service (L2-092, L2-095). */
export class DeleteItemDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly keep: Locator;
  readonly confirm: Locator;

  constructor(page: Page, kind: 'product' | 'service') {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.keep = this.root.getByRole('button', { name: `Keep ${kind}` });
    this.confirm = this.root.locator('.dialog__footer .btn--danger');
  }
}
