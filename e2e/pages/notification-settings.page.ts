import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/account/notifications`: the five e-mail switches and "How often" (L2-016, L2-149). */
export class NotificationSettingsPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly status: Locator;
  readonly frequency: Locator;
  readonly securityNote: Locator;
  readonly errorState: Locator;
  readonly tryAgain: Locator;
  readonly sectionTabs: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.status = this.main.locator('.cluster--between .inline-status');
    this.frequency = this.main.getByLabel('How often');
    this.securityNote = this.main.locator('.text-caption');
    this.errorState = this.main.getByRole('alert').filter({ hasText: 'JB-PREF-503' });
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.sectionTabs = this.main.getByRole('navigation', { name: 'Account sections' });
  }

  /** The switch with this label, for example "New messages". */
  switch(label: string): Locator {
    return this.main.getByRole('switch', { name: new RegExp(`^${label}`) });
  }

  async ready(): Promise<void> {
    await this.main.locator('h1').first().waitFor({ state: 'attached' });
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
