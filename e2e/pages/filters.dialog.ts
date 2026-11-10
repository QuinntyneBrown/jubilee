import type { Locator, Page } from '@playwright/test';

/** The filters sheet, opened from "Filters" under 768 px. */
export class FiltersDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly title: Locator;
  readonly close: Locator;
  readonly offers: Locator;
  readonly areas: Locator;
  readonly sort: Locator;
  readonly clearAll: Locator;
  readonly show: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'Filters' });
    this.panel = this.root.locator('.dialog__panel');
    this.title = this.root.getByRole('heading', { name: 'Filters' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.offers = this.root.getByRole('group', { name: 'Offers' });
    this.areas = this.root.getByRole('group', { name: 'Area served' });
    this.sort = this.root.getByLabel('Sort');
    this.clearAll = this.root.getByRole('button', { name: 'Clear all' });
    this.show = this.root.locator('.dialog__footer .btn--primary');
  }

  box(name: string): Locator {
    return this.root.getByRole('checkbox', { name, exact: true });
  }

  boxesIn(group: Locator): Locator {
    return group.locator('.choice__text');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
