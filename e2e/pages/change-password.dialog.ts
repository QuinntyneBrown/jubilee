import type { Locator, Page } from '@playwright/test';

/** The dialog that changes the password, or sets one for a member who joined with Google (L2-015). */
export class ChangePasswordDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly current: Locator;
  readonly next: Locator;
  readonly repeat: Locator;
  readonly currentError: Locator;
  readonly nextError: Locator;
  readonly repeatError: Locator;
  readonly save: Locator;
  readonly cancel: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.current = this.root.getByLabel('Current password');
    this.next = this.root.getByLabel('New password', { exact: true });
    this.repeat = this.root.getByLabel('Repeat new password');
    this.currentError = this.root.locator('#cp-current-error');
    this.nextError = this.root.locator('#cp-new-error');
    this.repeatError = this.root.locator('#cp-repeat-error');
    this.save = this.root.getByRole('button', { name: /^(Change password|Set password|Saving…)$/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
  }
}
