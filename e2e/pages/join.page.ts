import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The join page (sign-up): the form, its error summary and the "Check your e-mail" state. */
export class JoinPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly homeChurch: Locator;
  readonly agreement: Locator;
  readonly createAccount: Locator;
  readonly google: Locator;
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
    this.firstName = this.main.getByLabel('First name');
    this.lastName = this.main.getByLabel('Last name');
    this.email = this.main.getByLabel('E-mail');
    this.password = this.main.getByLabel('Password');
    this.homeChurch = this.main.getByLabel('Home church');
    this.agreement = this.main.getByRole('checkbox');
    this.createAccount = this.main.getByRole('button', { name: 'Create account' });
    this.google = this.main.getByRole('link', { name: 'Join with Google' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.notice = this.main.locator('.alert--warning');
    this.statementLink = this.main.getByRole('link', { name: 'statement of faith' });
    this.termsLink = this.main.getByRole('link', { name: 'terms', exact: true });
    this.signInLink = this.main.getByRole('link', { name: 'Sign in' });
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
