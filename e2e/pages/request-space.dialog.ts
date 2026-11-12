import type { Locator, Page } from '@playwright/test';

/** The dialog a member asks for a space in (L2-205 AC3–AC7). */
export class RequestSpaceDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly checkIn: Locator;
  readonly checkOut: Locator;
  readonly moveIn: Locator;
  readonly staying: Locator;
  readonly note: Locator;
  readonly noteLabel: Locator;
  /** The well with the nights and the total of a Short stay. */
  readonly amounts: Locator;
  readonly nights: Locator;
  readonly total: Locator;
  readonly payment: Locator;
  readonly fieldError: Locator;
  readonly alert: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly close: Locator;
  readonly viewRequest: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.checkIn = this.root.getByLabel('Check in');
    this.checkOut = this.root.getByLabel('Check out');
    this.moveIn = this.root.getByLabel('Move in');
    this.staying = this.root.getByLabel('Staying');
    this.note = this.root.getByLabel(/^A note to/);
    this.amounts = this.root.locator('dl.dl--rows');
    this.nights = this.amounts.locator('> div').first();
    this.total = this.amounts.locator('> div').last();
    this.payment = this.root.getByText('You won’t pay anything until the host accepts.');
    this.fieldError = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.send = this.root.getByRole('button', { name: 'Send request' });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' }).last();
    this.viewRequest = this.root.getByRole('link', { name: 'View request' });
    this.noteLabel = this.root.locator('label', { hasText: 'A note to' });
  }
}
