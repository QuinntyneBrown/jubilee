import type { Locator, Page } from '@playwright/test';

/** The product editor (L2-091): add or change a product. */
export class ProductEditorDialog {
  readonly root: Locator;
  readonly title: Locator;
  /** The line under the title: when what is saved becomes public. */
  readonly note: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly stock: Locator;
  readonly description: Locator;
  readonly errors: Locator;
  readonly alert: Locator;
  readonly submit: Locator;
  readonly cancel: Locator;
  readonly close: Locator;
  readonly keepEditing: Locator;
  readonly discard: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.note = this.root.locator('#dlg-desc');
    this.name = this.root.getByLabel(/^Product name/);
    this.price = this.root.getByLabel(/^Price/);
    this.stock = this.root.getByLabel(/^In stock/);
    this.description = this.root.getByLabel(/^Description/);
    this.errors = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.submit = this.root.locator('.dialog__footer .btn--primary');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.keepEditing = this.root.getByRole('button', { name: 'Keep editing' });
    this.discard = this.root.getByRole('button', { name: 'Discard', exact: true });
  }
}
