import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { ShellPage } from './shell.page';

/** `/my-business/products`: the owner's products (L2-089, L2-090). */
export class MyProductsPage extends ShellPage implements Screen {
  readonly heading: Locator;
  readonly sections: Locator;
  readonly summary: Locator;
  readonly add: Locator;
  readonly rows: Locator;
  /** The small tile beside each product's name. */
  readonly thumbs: Locator;
  readonly limit: Locator;
  readonly empty: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly backToOverview: Locator;
  readonly loading: Locator;
  readonly announcement: Locator;

  /** The state of each product: "Listed" or "Sold out". */
  readonly statusBadges: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.sections = this.main.getByRole('navigation', { name: 'My business sections' });
    this.summary = this.main.locator('p.text-muted').first();
    this.add = this.main.getByRole('button', { name: 'Add product' }).first();
    this.rows = this.main.locator('table.table tbody tr');
    this.thumbs = this.rows.locator('.media--thumb');
    this.statusBadges = this.rows.locator('.badge');
    this.limit = this.main.getByText('You can list up to 100 products.');
    this.empty = this.main.locator('.empty');
    this.reference = this.main.locator('code');
    this.tryAgain = this.main.getByRole('button', { name: 'Try again' });
    this.backToOverview = this.main.getByRole('link', { name: 'Back to overview' });
    this.loading = this.main.getByRole('status').filter({ hasText: 'Loading your products' });
    this.announcement = this.main.locator('span.visually-hidden[role="status"]');
  }

  row(name: string | RegExp): Locator {
    return this.rows.filter({ hasText: name });
  }

  status(name: string | RegExp): Locator {
    return this.row(name).locator('.badge');
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

  /** The names in the order shown. */
  async names(): Promise<string[]> {
    const cells = await this.rows.locator('td:first-child span').allTextContents();
    return cells.map((text) => text.trim());
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  regions(): Region[] {
    return [...this.chromeRegions(), { name: 'main', locator: this.main }];
  }
}
