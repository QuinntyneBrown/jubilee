import type { Locator, Page } from '@playwright/test';

/** The dialog that privately reports a listing (L2-039). */
export class ReportListingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly alert: Locator;
  readonly description: Locator;
  readonly counter: Locator;
  readonly reasonError: Locator;
  readonly descriptionError: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly close: Locator;
  readonly thanks: Locator;
  /** Every radio of "What’s wrong?". */
  readonly reasons: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.alert = this.root.getByRole('alert');
    this.description = this.root.getByLabel(/Tell us what happened/);
    this.counter = this.root.locator('#d-detail-count');
    this.reasonError = this.root.locator('#d-why-error');
    this.descriptionError = this.root.locator('#d-detail-error');
    this.send = this.root.getByRole('button', { name: /^Send report/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    // The footer's "Close" of the success state; the header's close button has the same name.
    this.close = this.root.locator('.dialog__footer').getByRole('button', { name: 'Close' });
    this.thanks = this.root.locator('#dlg-desc');
    this.reasons = this.root.getByRole('radio');
  }

  reason(label: string | RegExp): Locator {
    return this.root.getByRole('radio', { name: label });
  }
}
