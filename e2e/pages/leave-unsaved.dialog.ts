import type { Locator, Page } from '@playwright/test';

/** The question asked when the member leaves the account page with unsaved changes (L2-013). */
export class LeaveUnsavedDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly keepEditing: Locator;
  readonly leave: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.keepEditing = this.root.getByRole('button', { name: 'Keep editing' });
    this.leave = this.root.getByRole('button', { name: 'Leave without saving' });
  }
}
