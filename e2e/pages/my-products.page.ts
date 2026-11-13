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
  /** "Drag a product by its handle, or use the arrows, to change the order." (L2-090 AC2) */
  readonly dragHelp: Locator;

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
    this.dragHelp = this.main.getByText('Drag a product by its handle, or use the arrows');
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

  /** The handle a product is dragged by: a pointer affordance, hidden from the keyboard and assistive technology. */
  dragHandle(name: string): Locator {
    return this.row(name).locator('.cdk-drag-handle');
  }

  /**
   * Drags the product named `from` by its handle and drops it on the row of `to`, as a hand does: press,
   * move in steps so the drag starts, release.
   */
  async drag(from: string, to: string): Promise<void> {
    const handle = await this.dragHandle(from).boundingBox();
    const source = await this.row(from).boundingBox();
    const target = await this.row(to).boundingBox();
    if (!handle || !source || !target)
      throw new Error('The product to drag, or the place to drop it, is not on screen.');
    const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    const end = { x: start.x, y: target.y + (start.y - source.y) };
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + 4, start.y + 8, { steps: 4 });
    await this.page.mouse.move(end.x, end.y, { steps: 12 });
    await this.page.mouse.up();
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
