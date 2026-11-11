import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The sign-in page: e-mail and password, "Keep me signed in", Google, and the errors of a refusal. */
export class SignInPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly keepSignedIn: Locator;
  readonly signIn: Locator;
  readonly google: Locator;
  readonly forgotPassword: Locator;
  readonly joinFree: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly notice: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.email = this.main.getByLabel('E-mail');
    this.password = this.main.getByLabel('Password');
    this.keepSignedIn = this.main.getByRole('checkbox', { name: 'Keep me signed in' });
    this.signIn = this.main.getByRole('button', { name: 'Sign in' });
    this.google = this.main.getByRole('link', { name: 'Continue with Google' });
    this.forgotPassword = this.main.getByRole('link', { name: 'Forgot password?' });
    this.joinFree = this.main.getByRole('link', { name: 'Join free' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.notice = this.main.locator('.alert--danger:not(.form-summary)');
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-AUTH-503' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast-region .toast');
  }

  fieldError(id: string): Locator {
    return this.main.locator(`#${id}-error`);
  }

  /** The whole field of a control: label, control and error. */
  fieldOf(label: string): Locator {
    return this.main
      .locator('.field')
      .filter({ has: this.main.page().getByLabel(label, { exact: false }) })
      .first();
  }

  /** Types into a control and leaves it, so that it is shown at rest. */
  async typeAndLeave(control: Locator, value: string): Promise<void> {
    await control.fill(value);
    await control.blur();
  }

  /** Sends an address that is not one, then leaves the summary focus moved to. */
  async sendInvalidEmail(address: string, password: string): Promise<void> {
    await this.signInWith(address, password);
    await this.summary.evaluate(async (summary: HTMLElement) => {
      // The page moves focus to the summary a moment after it shows it.
      while (document.activeElement !== summary) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      summary.blur();
    });
  }

  async signInWith(email: string, password: string, keep = false): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    if (keep) await this.keepSignedIn.check();
    await this.signIn.click();
  }

  async ready(): Promise<void> {
    await this.main.locator('form, .empty').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}

/** The session-expired page. */
export class SessionExpiredPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  readonly signIn: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.signIn = this.main.getByRole('link', { name: 'Sign in' });
  }

  async ready(): Promise<void> {
    await this.main.locator('.empty').waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}

/** The account menu behind the avatar and the sign-out confirmation it leads to. */
export class AccountMenuRegion {
  readonly menu: Locator;
  readonly menuPanel: Locator;
  readonly items: Locator;
  readonly signOut: Locator;
  readonly confirm: Locator;
  readonly confirmTitle: Locator;
  readonly stay: Locator;
  readonly confirmSignOut: Locator;

  constructor(page: Page) {
    this.menu = page.getByRole('dialog', { name: 'Account' });
    this.menuPanel = this.menu.locator('.dialog__panel');
    this.items = this.menu.locator('.menu__item');
    this.signOut = this.menu.getByRole('button', { name: 'Sign out' });
    this.confirm = page.getByRole('dialog', { name: 'Sign out of Jubilee?' });
    this.confirmTitle = this.confirm.getByRole('heading');
    this.stay = this.confirm.getByRole('button', { name: 'Stay signed in' });
    this.confirmSignOut = this.confirm.getByRole('button', { name: 'Sign out' });
  }
}
