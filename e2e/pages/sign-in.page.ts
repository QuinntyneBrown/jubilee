import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The Log in screen: Google first, then e-mail and password, "Keep me logged in", and the errors of a refusal. */
export class SignInPage extends ShellPage implements Screen {
  readonly heading: Locator;
  /** The line under the heading. */
  readonly lead: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly passwordLabel: Locator;
  /** The button inside the password control: "Show password", then "Hide password". */
  readonly showPassword: Locator;
  readonly hidePassword: Locator;
  /** The password control with its button. */
  readonly passwordControl: Locator;
  readonly keepSignedIn: Locator;
  /** The checkbox with its text. */
  readonly keepSignedInChoice: Locator;
  readonly signIn: Locator;
  readonly google: Locator;
  /** Google's "G" in the Google button. */
  readonly googleMark: Locator;
  readonly forgotPassword: Locator;
  readonly joinFree: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly notice: Locator;
  readonly calmNotice: Locator;
  readonly divider: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;
  /** The brand panel beside the form, from 1024 px (L2-187). */
  readonly brandPanel: Locator;
  /** The mark and wordmark that lead to the welcome page: in the panel, or above the card. */
  readonly lockup: Locator;
  readonly panelLockup: Locator;
  /** The card that holds the form under 1024 px; from 1024 px it has no edge. */
  readonly card: Locator;
  /** What the brand panel says, in its display face. */
  readonly panelHeadline: Locator;

  constructor(page: Page) {
    super(page);
    this.brandPanel = this.main.locator('.auth-layout__panel');
    this.lockup = this.main.getByRole('link', { name: 'Jubilee home' });
    this.panelLockup = this.brandPanel.getByRole('link', { name: 'Jubilee home' });
    this.card = this.frameCard;
    this.panelHeadline = this.brandPanel.locator('.auth-layout__headline');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('.auth-card__lead');
    this.email = this.main.getByLabel('Email', { exact: true });
    this.password = this.main.getByLabel('Password', { exact: true });
    this.passwordLabel = this.main.locator('label', { hasText: 'Password' });
    this.showPassword = this.main.getByRole('button', { name: 'Show password' });
    this.hidePassword = this.main.getByRole('button', { name: 'Hide password' });
    this.passwordControl = this.main.locator('.password-input');
    this.keepSignedIn = this.main.getByRole('checkbox', { name: 'Keep me logged in' });
    this.keepSignedInChoice = this.main.locator('.choice').filter({ hasText: 'Keep me logged in' });
    this.signIn = this.main.getByRole('button', { name: 'Log in', exact: true });
    // A link in the app; the mock draws it as a button.
    this.google = this.main.locator('.btn', { hasText: 'Continue with Google' });
    this.googleMark = this.google.locator('.google-mark');
    this.forgotPassword = this.main.getByRole('link', { name: 'Forgot password?' });
    this.joinFree = this.main.getByRole('link', { name: 'Create a free account' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.notice = this.main.locator('.alert--danger:not(.form-summary)');
    this.calmNotice = this.main.locator('.alert--warning');
    this.divider = this.main.locator('.divider-text');
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

  /** Ticks "Keep me logged in" and leaves it, so that it is shown at rest. */
  async keepAndLeave(): Promise<void> {
    // By keyboard: a pointer left over the box would show it hovered.
    await this.keepSignedIn.press('Space');
    await this.keepSignedIn.blur();
  }

  /** Fills the form as the mock draws it: the e-mail last, which keeps the focus as it has there. */
  async fillAsDrawn(): Promise<void> {
    await this.password.fill('longpassword1');
    // By keyboard: a pointer left over the box would show it hovered.
    await this.keepSignedIn.press('Space');
    await this.email.fill('joanna.adeyemi@example.com');
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

/** Log in after a request that failed; the state has no address, so the screen sends the form. */
export class SignInErrorScreen extends SignInPage {
  override async ready(): Promise<void> {
    await super.ready();
    // The mock is drawn in the state already.
    if (await this.errorState.isVisible()) return;
    await this.signInWith('joanna.adeyemi@example.com', 'longpassword1');
    await this.errorState.waitFor();
  }
}

/** Log in while its form is on the way. */
export class SignInSubmittingScreen extends SignInPage {
  override async ready(): Promise<void> {
    await super.ready();
    if ((await this.signIn.getAttribute('aria-busy')) === 'true') return;
    await this.fillAsDrawn();
    await this.signIn.click();
    await this.main.locator('.btn[aria-busy="true"]').waitFor();
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
