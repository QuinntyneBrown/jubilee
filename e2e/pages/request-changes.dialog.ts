import type { Locator, Page } from '@playwright/test';

/** The request-changes dialog (L2-102): pick what to change and write the message. */
export class RequestChangesDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly areas: Locator;
  readonly message: Locator;
  readonly errors: Locator;
  readonly alert: Locator;
  readonly cancel: Locator;
  readonly send: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.areas = this.root.getByRole('checkbox');
    this.message = this.root.getByRole('textbox', { name: /Message to/ });
    this.errors = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.send = this.root.getByRole('button', { name: 'Send request' });
  }

  area(name: string): Locator {
    return this.root.getByRole('checkbox', { name });
  }
}
