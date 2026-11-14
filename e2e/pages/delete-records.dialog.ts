import type { Locator, Page } from '@playwright/test';

/**
 * The delete dialog of the admin application (L2-281 AC1, AC2): it names the records, warns of the
 * records that point at them, and, for more than one, asks for "delete" to be typed.
 */
export class DeleteRecordsDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly doomed: Locator;
  readonly pointing: Locator;
  readonly confirmation: Locator;
  readonly keep: Locator;
  readonly delete: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('alertdialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.doomed = this.root.locator('.doomed li');
    this.pointing = this.root.locator('.alert');
    this.confirmation = this.root.getByLabel('Type delete to confirm');
    this.keep = this.root.getByRole('button', { name: /^Keep (it|them)$/ });
    this.delete = this.root.getByRole('button', { name: /^Delete / });
  }
}
