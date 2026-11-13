import type { Locator, Page } from '@playwright/test';

/** The toasts that rise from the bottom of the screen. */
export class Toasts {
  readonly region: Locator;
  /** Every toast on show. */
  readonly all: Locator;

  constructor(private readonly page: Page) {
    this.region = page.locator('.toast-region');
    this.all = this.region.locator('.toast');
  }

  /** The toast with this title. */
  withTitle(title: string | RegExp): Locator {
    return this.region
      .locator('.toast')
      .filter({ has: this.page.locator('.toast__title', { hasText: title }) });
  }

  /** The info toast with this title: something to know, nothing to do. */
  info(title: string | RegExp): Locator {
    return this.region
      .locator('.toast.toast--info')
      .filter({ has: this.page.locator('.toast__title', { hasText: title }) });
  }

  /** The warning toast with this title: something needs attention, nothing broke. */
  warning(title: string | RegExp): Locator {
    return this.region
      .locator('.toast.toast--warning')
      .filter({ has: this.page.locator('.toast__title', { hasText: title }) });
  }

  /** The danger toast with this title: something failed; it stays until dismissed. */
  danger(title: string | RegExp): Locator {
    return this.region
      .locator('.toast.toast--danger')
      .filter({ has: this.page.locator('.toast__title', { hasText: title }) });
  }

  /** The titles of the toasts on show, in the order they are stacked (and tabbed through). */
  titles(): Promise<string[]> {
    return this.all.locator('.toast__title').allTextContents();
  }

  /** Waits until the toast has finished rising, so its place can be measured. */
  async settled(toast: Locator): Promise<void> {
    await toast.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
  }

  action(toast: Locator, label: string): Locator {
    return toast.getByRole('button', { name: label, exact: true });
  }

  dismiss(toast: Locator): Locator {
    return toast.getByRole('button', { name: 'Dismiss' });
  }
}
