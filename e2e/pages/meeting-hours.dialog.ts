import type { Locator, Page } from '@playwright/test';

/** The dialog in which an owner says when meetings can be booked (L2-220). */
export class MeetingHoursDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly days: Locator;
  readonly daysError: Locator;
  readonly from: Locator;
  readonly fromError: Locator;
  readonly until: Locator;
  readonly untilError: Locator;
  readonly every: Locator;
  readonly everyError: Locator;
  readonly save: Locator;
  readonly cancel: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.alert = this.root.getByRole('alert');
    this.days = this.root.getByRole('group', { name: 'Days' });
    this.daysError = this.root.locator('#d-days-error');
    this.from = this.root.getByLabel(/^From/);
    this.fromError = this.root.locator('#d-from-error');
    this.until = this.root.getByLabel(/^Until/);
    this.untilError = this.root.locator('#d-until-error');
    this.every = this.root.getByLabel('A time every');
    this.everyError = this.root.locator('#d-every-error');
    this.save = this.root.getByRole('button', { name: /^Save hours/ });
    this.cancel = this.root.getByRole('button', { name: 'Cancel' });
    this.close = this.root.getByRole('button', { name: 'Close' });
  }

  /** The checkbox of one day of the week. */
  day(name: string): Locator {
    return this.days.getByRole('checkbox', { name, exact: true });
  }

  /** The days that are ticked, in the order shown. */
  async ticked(): Promise<string[]> {
    await this.days.waitFor();
    const names: string[] = [];
    for (const box of await this.days.getByRole('checkbox').all()) {
      if (await box.isChecked())
        names.push(((await box.locator('xpath=..').textContent()) ?? '').trim());
    }
    return names;
  }
}
