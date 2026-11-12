import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AccountPage } from './account.page';

/** The dialog that asks before the member's other devices are signed out (L2-011 AC4, AC5). */
export class SignOutOthersDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly keep: Locator;
  readonly confirm: Locator;
  readonly failure: Locator;
  readonly close: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Sign out of your other devices?' });
    this.panel = this.root.locator('.dialog__panel');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('#dlg-desc');
    this.keep = this.root.getByRole('button', { name: 'Keep them signed in' });
    this.confirm = this.root.getByRole('button', { name: 'Sign out of other devices' });
    this.failure = this.root.getByRole('alert');
    this.close = this.root.getByRole('button', { name: 'Close' });
  }
}

/** The dialog as a screen of the sweeps: it has no address, so the screen opens it from the account page. */
export class SignOutOthersScreen extends SignOutOthersDialog implements Screen {
  constructor(protected readonly page: Page) {
    super(page);
  }

  async ready(): Promise<void> {
    // The mock is drawn with the dialog open.
    if (await this.root.isVisible()) return;
    await new AccountPage(this.page).signOutOthers.click();
    await this.keep.waitFor();
  }

  regions(): Region[] {
    return [{ name: 'dialog', locator: this.root }];
  }
}

/** The dialog while the request is on its way. */
export class SignOutOthersBusyScreen extends SignOutOthersScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if ((await this.confirm.getAttribute('aria-busy')) === 'true') return;
    await this.confirm.click();
    await this.root.locator('.btn[aria-busy="true"]').waitFor();
  }
}

/** The dialog after the request failed. */
export class SignOutOthersFailedScreen extends SignOutOthersScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.failure.isVisible()) return;
    await this.confirm.click();
    await this.failure.waitFor();
  }
}
