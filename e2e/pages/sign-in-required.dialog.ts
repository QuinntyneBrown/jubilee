import type { Locator, Page } from '@playwright/test';

/** The "Join to …" prompt a visitor sees for an action that needs an account (L2-012). */
export class SignInRequiredDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly signIn: Locator;
  readonly joinFree: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.signIn = this.root.getByRole('link', { name: 'Sign in' });
    this.joinFree = this.root.getByRole('link', { name: 'Join free' });
    this.close = this.root.getByRole('button', { name: 'Close' });
  }
}
