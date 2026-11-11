import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/forgot-password`: asks for a reset link (L2-008). */
export class ForgotPasswordPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly email: Locator;
  /** The whole field of the e-mail: label, control and error. */
  readonly emailField: Locator;
  readonly send: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly emailError: Locator;
  readonly backToSignIn: Locator;
  readonly sentHeading: Locator;
  readonly sentText: Locator;
  readonly errorState: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.email = this.main.getByLabel('E-mail');
    this.emailField = this.main.locator('.field').filter({ has: page.getByLabel('E-mail') });
    this.send = this.main.getByRole('button', { name: 'Send reset link' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.emailError = this.main.locator('#email-error');
    this.backToSignIn = this.main.getByRole('link', { name: 'Back to sign in' });
    this.sentHeading = this.main.getByRole('heading', { name: 'Check your e-mail' });
    this.sentText = this.main.locator('.empty__text');
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-AUTH-503' });
    this.reference = this.errorState.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  /** Sends the form empty, then leaves the summary so that it is shown at rest. */
  async sendEmpty(): Promise<void> {
    await this.send.click();
    await this.summary.evaluate(async (summary: HTMLElement) => {
      // The page moves focus to the summary a moment after it shows it.
      while (document.activeElement !== summary) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      summary.blur();
    });
  }

  /** Sends an address that is not one, then returns to the field, as the mock draws the state. */
  async sendMalformedAndReturn(address: string): Promise<void> {
    await this.email.fill(address);
    await this.send.click();
    await this.summary.evaluate(async (summary: HTMLElement) => {
      // The page moves focus to the summary a moment after it shows it.
      while (document.activeElement !== summary) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });
    await this.email.focus();
  }

  async ready(): Promise<void> {
    await this.main.locator('h1').first().waitFor();
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}
