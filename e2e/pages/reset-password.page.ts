import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/reset-password/:token`: chooses a new password (L2-009). */
export class ResetPasswordPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly forAccount: Locator;
  readonly password: Locator;
  readonly repeat: Locator;
  readonly change: Locator;
  readonly summary: Locator;
  readonly summaryLinks: Locator;
  readonly passwordError: Locator;
  readonly repeatError: Locator;
  readonly sendNewLink: Locator;
  readonly signIn: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.forAccount = this.main.locator('.text-muted');
    this.password = this.main.getByLabel('New password', { exact: true });
    this.repeat = this.main.getByLabel('Repeat new password');
    this.change = this.main.getByRole('button', { name: 'Change password' });
    this.summary = this.main.locator('#summary');
    this.summaryLinks = this.summary.getByRole('link');
    this.passwordError = this.main.locator('#password-error');
    this.repeatError = this.main.locator('#confirm-error');
    this.sendNewLink = this.main.getByRole('link', { name: 'Send a new link' });
    this.signIn = this.main.getByRole('link', { name: 'Sign in' });
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-AUTH-503' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  async fill(password: string, repeat = password): Promise<void> {
    await this.password.fill(password);
    await this.repeat.fill(repeat);
  }

  async ready(): Promise<void> {
    await this.main.locator('h1').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}
