import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The Sign up screen (`/join`): Google first, the form, its error summary and the "Check your e-mail" state. */
export class JoinPage extends ShellPage implements Screen {
  readonly heading: Locator;
  /** The line under the heading. */
  readonly lead: Locator;
  /** The brand panel beside the form, from 1024 px (L2-187). */
  readonly brandPanel: Locator;
  /** The mark and wordmark that lead to the welcome page: in the panel, or above the card. */
  readonly lockup: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly homeChurch: Locator;
  readonly passwordHint: Locator;
  readonly homeChurchHint: Locator;
  readonly agreement: Locator;
  /** The sentence beside the agreement box. */
  readonly agreementText: Locator;
  readonly createAccount: Locator;
  readonly google: Locator;
  /** Google's "G" in the Google button. */
  readonly googleMark: Locator;
  readonly divider: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly notice: Locator;
  readonly statementLink: Locator;
  readonly termsLink: Locator;
  readonly signInLink: Locator;
  readonly sentHeading: Locator;
  readonly sentText: Locator;
  readonly sendAgain: Locator;
  readonly errorState: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('.auth-card__lead');
    this.brandPanel = this.main.locator('.auth-layout__panel');
    this.lockup = this.main.getByRole('link', { name: 'Jubilee home' });
    this.firstName = this.main.getByLabel('First name');
    this.lastName = this.main.getByLabel('Last name');
    this.email = this.main.getByLabel('Email', { exact: true });
    this.password = this.main.getByLabel('Password', { exact: true });
    this.homeChurch = this.main.getByLabel('Home church');
    this.passwordHint = this.main.locator('#password-help');
    this.homeChurchHint = this.main.locator('#church-help');
    this.agreement = this.main.getByRole('checkbox');
    this.agreementText = this.main.locator('.choice__text');
    this.createAccount = this.main.getByRole('button', { name: 'Create account' });
    // A link in the app; the mock draws it as a button.
    this.google = this.main.locator('.btn', { hasText: 'Sign up with Google' });
    this.googleMark = this.google.locator('.google-mark');
    this.divider = this.main.locator('.divider-text');
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.notice = this.main.locator('.alert--warning');
    this.statementLink = this.main.getByRole('link', { name: 'statement of faith' });
    this.termsLink = this.main.getByRole('link', { name: 'terms', exact: true });
    this.signInLink = this.main.getByRole('link', { name: 'Log in', exact: true });
    this.sentHeading = this.main.getByRole('heading', { name: 'Check your e-mail' });
    this.sentText = this.main.locator('.empty__text');
    this.sendAgain = this.main.getByRole('button', { name: 'Send it again' });
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-AUTH-503' });
  }

  fieldError(id: string): Locator {
    return this.main.locator(`#${id}-error`);
  }

  async fill(values: {
    first?: string;
    last?: string;
    email?: string;
    password?: string;
    church?: string;
    agree?: boolean;
  }): Promise<void> {
    if (values.first !== undefined) await this.firstName.fill(values.first);
    if (values.last !== undefined) await this.lastName.fill(values.last);
    if (values.email !== undefined) await this.email.fill(values.email);
    if (values.password !== undefined) await this.password.fill(values.password);
    if (values.church !== undefined) await this.homeChurch.fill(values.church);
    if (values.agree !== undefined) await this.agreement.setChecked(values.agree);
  }

  /** The whole field of a control: label, hint and control. */
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

  async ready(): Promise<void> {
    await this.main.locator('form, .empty').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}
