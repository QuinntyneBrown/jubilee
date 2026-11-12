import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/sign-in`, `/signed-out` and `/session-expired` of the admin application (L2-189, L2-190). */
export class AdminSignInPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly lead: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly signIn: Locator;
  readonly busy: Locator;
  readonly membersLink: Locator;
  readonly textFields: Locator;
  /** The brand panel beside the form from 1024 px, with the admin application's words. */
  readonly brandPanel: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.frameCard.getByRole('heading', { level: 1 });
    this.lead = this.frameCard.locator('.auth-card__lead');
    this.alert = this.frameCard.locator('.alert');
    this.reference = this.alert.locator('code');
    this.signIn = this.frameCard.getByRole('button', {
      name: /^(Sign in with your staff account|Try again|Sign in again|Signing in…)$/,
    });
    this.busy = this.frameCard.getByRole('button', { name: 'Signing in…' });
    this.membersLink = this.frameFoot.getByRole('link', { name: 'app.jubilee.to' });
    this.textFields = this.main.locator('input');
    this.brandPanel = this.main.locator('.auth-layout__panel');
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [
      { name: 'brand', locator: this.frameBrand },
      { name: 'card', locator: this.frameCard },
      { name: 'foot', locator: this.frameFoot },
    ];
  }
}
