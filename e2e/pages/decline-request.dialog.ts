import type { Locator, Page } from '@playwright/test';

/** The decline dialog (L2-053): the owner declines with a reason and a note. */
export class DeclineRequestDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly reason: Locator;
  readonly message: Locator;
  readonly error: Locator;
  readonly alert: Locator;
  readonly keep: Locator;
  readonly decline: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.reason = this.root.getByRole('combobox', { name: 'Reason' });
    this.message = this.root.getByRole('textbox', { name: /^Message to / });
    this.error = this.root.locator('.field__error');
    this.alert = this.root.getByRole('alert');
    this.keep = this.root.getByRole('button', { name: 'Keep request' });
    this.decline = this.root.getByRole('button', { name: 'Decline request' });
  }

  /** Closes the dialog with the keyboard. */
  async escape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
