import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminPolicyPage } from './admin-policy.page';
import { Toasts } from './toasts';

/** "Publish version {n} of {title}?" (L2-241): confirms the publish of a policy page's draft. */
export class PublishPolicyDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly keepEditing: Locator;
  readonly publish: Locator;
  readonly tryAgain: Locator;
  readonly reload: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.locator('.dialog__title');
    this.description = this.root.locator('.dialog__desc');
    this.alert = this.root.getByRole('alert');
    this.keepEditing = this.root.getByRole('button', { name: 'Keep editing' });
    this.publish = this.root.getByRole('button', { name: /^Publish version/ });
    this.tryAgain = this.root.getByRole('button', { name: 'Try again' });
    this.reload = this.root.getByRole('button', { name: 'Reload' });
  }
}

/** The dialog as a screen of the sweeps: it has no address, so the screen opens it from the editor. */
export class PublishPolicyScreen extends PublishPolicyDialog implements Screen {
  constructor(protected readonly page: Page) {
    super(page);
  }

  async ready(): Promise<void> {
    // The mock is drawn with the dialog open.
    if (await this.title.isVisible()) return;
    await new AdminPolicyPage(this.page).publish.click();
    await this.title.waitFor();
  }

  regions(): Region[] {
    return [{ name: 'dialog', locator: this.page.locator('.dialog__panel') }];
  }
}

/** The dialog while the publish is sent, or after it failed or was refused: Publish is pressed. */
export class PublishPolicySentScreen extends PublishPolicyScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if ((await this.alert.isVisible()) || (await this.root.locator('[aria-busy="true"]').count()))
      return;
    await this.publish.click();
    await this.root.locator('[aria-busy="true"], [role="alert"]').first().waitFor();
  }
}

/** The editor after a publish: version 3 is published and the toast says so. */
export class AdminPolicyPublishedScreen extends AdminPolicyPage {
  override async ready(): Promise<void> {
    await super.ready();
    const toasts = new Toasts(this.page);
    if (await toasts.all.count()) return;
    await this.publish.click();
    await new PublishPolicyDialog(this.page).publish.click();
    await toasts.withTitle('Version 3 published').waitFor();
    await this.heading.waitFor();
  }

  override regions(): Region[] {
    return [...super.regions(), { name: 'toasts', locator: new Toasts(this.page).region }];
  }
}

/** The editor after Publish was pressed with section 3 emptied: its fields say what is missing. */
export class AdminPolicyInvalidScreen extends AdminPolicyPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.formAlert.isVisible()) return;
    await this.sectionHeading(3).fill('');
    await this.sectionText(3).fill('');
    await this.publish.click();
    await this.formAlert.waitFor();
  }
}
