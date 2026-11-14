import type { Locator, Page } from '@playwright/test';

/** The reason a private table's export needs (L2-279 AC4): "Why export {table}?". */
export class ExportReasonDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly reason: Locator;
  readonly cancel: Locator;
  readonly export: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.reason = this.root.getByLabel('Reason');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.export = this.root.getByRole('button', { name: 'Export CSV' });
  }
}
