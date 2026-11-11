import type { Locator, Page } from '@playwright/test';

/** The approval dialog (L2-101): confirms the approval; a note is needed when checks are unticked. */
export class ApproveListingDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly warning: Locator;
  readonly note: Locator;
  readonly noteError: Locator;
  readonly alert: Locator;
  readonly notYet: Locator;
  readonly approve: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.warning = this.root.locator('.alert--warning');
    this.note = this.root.getByRole('textbox', { name: /Note/ });
    this.noteError = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.notYet = this.root.getByRole('button', { name: 'Not yet' });
    this.approve = this.root.getByRole('button', { name: 'Approve and publish' });
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
  }
}
