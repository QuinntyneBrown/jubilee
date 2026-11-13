import type { Locator } from '@playwright/test';

/**
 * "Your address": a listing's address as text in a read-only field, with "Copy" where the screen
 * offers it (L2-244). The publish success state, My business and the listing editor each hold one.
 */
export class AddressField {
  /** The read-only field; its value is the address without its scheme. */
  readonly value: Locator;
  readonly copy: Locator;
  /** The line under the field. */
  readonly help: Locator;
  /** The polite status that says the address was copied (L2-244 AC2). */
  readonly status: Locator;

  constructor(within: Locator) {
    this.value = within.getByLabel('Your address');
    const field = within.locator('.field').filter({ has: within.page().getByLabel('Your address') });
    this.copy = field.getByRole('button', { name: /^(Copy|Copied)/ });
    this.help = field.locator('.field__help');
    this.status = field.getByRole('status');
  }
}
