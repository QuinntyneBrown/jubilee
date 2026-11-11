import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/forgot-password`: asks for a reset link (L2-008). */
export class ForgotPasswordPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly email: Locator;
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

  async ready(): Promise<void> {
    await this.main.locator('h1').first().waitFor();
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}
