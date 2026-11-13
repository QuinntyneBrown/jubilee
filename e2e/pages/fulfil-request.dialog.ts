import type { Locator, Page } from '@playwright/test';

/** The fulfil dialog (L2-225): the owner marks a confirmed order fulfilled. */
export class FulfilRequestDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly details: Locator;
  /** The sentence under the details that says what the customer is told. */
  readonly consequence: Locator;
  readonly alert: Locator;
  readonly notYet: Locator;
  readonly fulfil: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.details = this.root.locator('dl');
    this.consequence = this.root.locator('p.text-muted').last();
    this.alert = this.root.getByRole('alert');
    this.notYet = this.root.getByRole('button', { name: 'Not yet' });
    this.fulfil = this.root.getByRole('button', { name: 'Mark fulfilled' });
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
  }
}
