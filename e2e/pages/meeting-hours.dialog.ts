import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { MyServicesPage } from './my-services.page';
import { Toasts } from './toasts';

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

/** The dialog as a screen of the sweeps: it has no address, so the screen opens it from My services. */
export class MeetingHoursScreen extends MeetingHoursDialog implements Screen {
  constructor(protected readonly page: Page) {
    super(page);
  }

  async ready(): Promise<void> {
    // The mock is drawn with the dialog open.
    if (await this.root.isVisible()) return;
    await new MyServicesPage(this.page).meetingHours.click();
    await this.save.waitFor();
  }

  regions(): Region[] {
    return [{ name: 'dialog', locator: this.root }];
  }
}

/** The dialog with no day ticked and a closing time that is not after the opening time. */
export class MeetingHoursInvalidScreen extends MeetingHoursScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.daysError.isVisible()) return;
    for (const day of await this.ticked()) await this.day(day).uncheck();
    await this.until.fill('09:00');
    await this.save.click();
    await this.daysError.waitFor();
  }
}

/** The dialog while the hours are being saved. */
export class MeetingHoursBusyScreen extends MeetingHoursScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if ((await this.save.getAttribute('aria-busy')) === 'true') return;
    await this.save.click();
    await this.root.locator('.btn[aria-busy="true"]').waitFor();
  }
}

/** The dialog after the save failed. */
export class MeetingHoursFailedScreen extends MeetingHoursScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.alert.isVisible()) return;
    await this.save.click();
    await this.alert.waitFor();
  }
}

/** My services after the hours were saved: the dialog has closed and a toast says so. */
export class MeetingHoursSavedScreen extends MyServicesPage {
  override async ready(): Promise<void> {
    await super.ready();
    const saved = new Toasts(this.page).withTitle('Meeting hours saved');
    if (await saved.isVisible()) return;
    const dialog = new MeetingHoursDialog(this.page);
    await this.meetingHours.click();
    await dialog.save.click();
    await saved.waitFor();
  }

  override regions(): Region[] {
    return [...super.regions(), { name: 'toasts', locator: new Toasts(this.page).region }];
  }
}
