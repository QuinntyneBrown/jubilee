import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/my-business/services`: the owner's services (L2-092, L2-093). */
export class MyServicesPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly summary: Locator;
  readonly add: Locator;
  readonly meetingHours: Locator;
  readonly rows: Locator;
  readonly limit: Locator;
  readonly empty: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly loading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.summary = this.main.locator('p.text-muted').first();
    this.add = this.main.getByRole('button', { name: 'Add service' }).first();
    this.meetingHours = this.main.getByRole('button', { name: 'Meeting hours' });
    this.rows = this.main.locator('ul.rows > li');
    this.limit = this.main.getByText('You can list up to 50 services.');
    this.empty = this.main.locator('.empty');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.loading = this.main.getByRole('status').filter({ hasText: 'Loading your services' });
  }

  row(name: string | RegExp): Locator {
    return this.rows.filter({ hasText: name });
  }

  price(name: string | RegExp): Locator {
    return this.row(name).locator('.row__price');
  }

  edit(name: string): Locator {
    return this.main.getByRole('button', { name: `Edit ${name}` });
  }

  remove(name: string): Locator {
    return this.main.getByRole('button', { name: `Delete ${name}` });
  }

  moveUp(name: string): Locator {
    return this.main.getByRole('button', { name: `Move ${name} up` });
  }

  moveDown(name: string): Locator {
    return this.main.getByRole('button', { name: `Move ${name} down` });
  }

  async names(): Promise<string[]> {
    const titles = await this.rows.locator('.row__title').allTextContents();
    return titles.map((text) => text.trim());
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
