import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/** `/featured` of the admin application: choosing the businesses "Featured this week" (L2-106). */
export class AdminFeaturedPage extends AdminShellPage implements Screen {
  readonly heading: Locator;
  readonly startDate: Locator;
  readonly chosen: Locator;
  readonly search: Locator;
  readonly found: Locator;
  readonly count: Locator;
  readonly save: Locator;
  readonly alert: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.startDate = this.main.getByLabel('Starts on');
    this.chosen = this.main.getByRole('list', { name: 'Featured this week' }).locator('li');
    this.search = this.main.getByRole('searchbox', { name: 'Add a live business' });
    this.found = this.main.getByRole('list', { name: 'Live businesses found' });
    this.count = this.main.locator('.field__help[role="status"]');
    this.save = this.main.getByRole('button', { name: 'Save selection' });
    this.alert = this.main.getByRole('alert');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
  }

  add(name: string): Locator {
    return this.found.getByRole('button', { name: `Add ${name}` });
  }

  remove(name: string): Locator {
    return this.main.getByRole('button', { name: `Remove ${name}` });
  }

  moveDown(name: string): Locator {
    return this.main.getByRole('button', { name: `Move ${name} down` });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
