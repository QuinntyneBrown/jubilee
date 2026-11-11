import type { Locator, Page } from '@playwright/test';

/** The dialog that reports a conversation and, for a member, blocks the business (L2-063). */
export class ReportConversationDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly what: Locator;
  readonly counter: Locator;
  readonly whatError: Locator;
  readonly block: Locator;
  readonly blockHelp: Locator;
  readonly send: Locator;
  readonly cancel: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.what = this.root.getByLabel(/Tell us what happened/);
    this.counter = this.root.locator('#d-what-count');
    this.whatError = this.root.locator('#d-what-error');
    this.block = this.root.getByRole('checkbox', { name: /^Block / });
    this.blockHelp = this.root.locator('.choice__text small');
    this.send = this.root.getByRole('button', { name: /^Send report/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' }).last();
  }
}
