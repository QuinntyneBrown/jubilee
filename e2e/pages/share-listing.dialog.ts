import type { Locator, Page } from '@playwright/test';

/** The dialog that shares a listing's link (L2-038). */
export class ShareListingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly link: Locator;
  readonly copy: Locator;
  readonly email: Locator;
  readonly whatsapp: Locator;
  readonly more: Locator;
  readonly done: Locator;
  /** The polite status that says the link was copied (L2-038 AC2). */
  readonly status: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.link = this.root.getByLabel('Link');
    this.copy = this.root.getByRole('button', { name: /^(Copy|Copied)/ });
    this.email = this.root.getByRole('link', { name: 'E-mail' });
    this.whatsapp = this.root.getByRole('link', { name: 'WhatsApp' });
    this.more = this.root.getByRole('button', { name: /^More/ });
    this.done = this.root.getByRole('button', { name: 'Done' });
    this.status = this.root.getByRole('status');
  }
}
