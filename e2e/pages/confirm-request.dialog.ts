import type { Locator, Page } from '@playwright/test';

/** The confirm dialog (L2-052): the owner confirms an order, a booking, a quote or a space request. */
export class ConfirmRequestDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly details: Locator;
  readonly alert: Locator;
  readonly notYet: Locator;
  readonly confirm: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.details = this.root.locator('dl');
    this.alert = this.root.getByRole('alert');
    this.notYet = this.root.getByRole('button', { name: 'Not yet' });
    this.confirm = this.root.getByRole('button', {
      name: /^Confirm (order|booking|quote request|request)$/,
    });
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
  }
}
