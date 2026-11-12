import type { Locator, Page } from '@playwright/test';

/** The toasts that rise from the bottom of the screen. */
export class Toasts {
  readonly region: Locator;

  constructor(private readonly page: Page) {
    this.region = page.locator('.toast-region');
  }

  /** The toast with this title. */
  withTitle(title: string | RegExp): Locator {
    return this.region
      .locator('.toast')
      .filter({ has: this.page.locator('.toast__title', { hasText: title }) });
  }

  /** The warning toast with this title: something needs attention, nothing broke. */
  warning(title: string | RegExp): Locator {
    return this.region
      .locator('.toast.toast--warning')
      .filter({ has: this.page.locator('.toast__title', { hasText: title }) });
  }

  action(toast: Locator, label: string): Locator {
    return toast.getByRole('button', { name: label, exact: true });
  }

  dismiss(toast: Locator): Locator {
    return toast.getByRole('button', { name: 'Dismiss' });
  }
}
