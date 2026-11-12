import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** The verify-e-mail page: waiting for the link, opening it, and what comes of it. */
export class VerifyEmailPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly text: Locator;
  readonly sendAgain: Locator;
  readonly sendNewLink: Locator;
  readonly useAnother: Locator;
  readonly status: Locator;
  /** The spinner shown while the link is checked. */
  readonly spinner: Locator;
  readonly errorState: Locator;
  readonly errorReference: Locator;
  readonly tryAgain: Locator;
  readonly startBrowsing: Locator;
  readonly continueWhereYouLeftOff: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.text = this.main.locator('.empty__text');
    this.sendAgain = this.main.getByRole('button', { name: 'Send it again' });
    this.sendNewLink = this.main.getByRole('button', { name: 'Send a new link' });
    this.useAnother = this.main.getByRole('button', { name: 'Use another e-mail' });
    this.status = this.main.getByRole('status');
    this.spinner = this.main.locator('.spinner');
    this.errorState = this.main.getByRole('alert');
    this.errorReference = this.errorState.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.startBrowsing = this.main.getByRole('link', { name: 'Start browsing' });
    this.continueWhereYouLeftOff = this.main.getByRole('link', {
      name: 'Continue where you left off',
    });
  }

  async ready(): Promise<void> {
    await this.main.locator('.empty').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [{ name: 'main', locator: this.main }];
  }
}

/** The banner that asks an unconfirmed member to confirm the address; it sits above `main`. */
export class VerifyEmailBannerRegion {
  readonly banner: Locator;
  readonly sendAgain: Locator;
  readonly changeEmail: Locator;
  readonly dismiss: Locator;

  constructor(page: Page) {
    this.banner = page.locator('.alert.banner');
    this.sendAgain = this.banner.getByRole('button', { name: /^Send (it again|a new link)$/ });
    this.changeEmail = this.banner.getByRole('button', { name: 'Change e-mail' });
    this.dismiss = this.banner.getByRole('button', { name: 'Dismiss' });
  }
}
