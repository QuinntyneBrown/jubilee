import type { Locator, Page } from '@playwright/test';

/** The account menu behind the avatar (L2-019). */
export class AccountMenuDialog {
  readonly root: Locator;
  readonly name: Locator;
  readonly email: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Account' });
    this.name = this.root.locator('.row__title');
    this.email = this.root.locator('.row__meta');
    this.items = this.root.locator('.menu__item');
  }

  item(name: string): Locator {
    return this.root.getByRole('link', { name, exact: true });
  }
}
