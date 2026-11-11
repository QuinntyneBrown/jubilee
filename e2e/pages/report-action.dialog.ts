import type { Locator, Page } from '@playwright/test';

/** The dialog that collects the resolution note (and message) for a report action (L2-105). */
export class ReportActionDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly note: Locator;
  readonly message: Locator;
  readonly error: Locator;
  readonly alert: Locator;
  readonly cancel: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.note = this.root.getByRole('textbox', { name: /Resolution note/ });
    this.message = this.root.getByRole('textbox', { name: /^Message/ });
    this.error = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
  }

  confirm(label: string): Locator {
    return this.root.getByRole('button', { name: label, exact: true });
  }
}
