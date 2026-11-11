import type { Locator, Page } from '@playwright/test';

/** The dialog in which an owner says the day they are back (L2-062). */
export class AwayPeriodDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly backOn: Locator;
  readonly backOnError: Locator;
  readonly save: Locator;
  readonly clear: Locator;
  readonly cancel: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.backOn = this.root.getByLabel(/Back on/);
    this.backOnError = this.root.locator('#d-back-error');
    this.save = this.root.getByRole('button', { name: /^Save/ });
    this.clear = this.root.getByRole('button', { name: 'Clear away period' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' });
  }
}
