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
  /** "Drag a service by its handle, or use the arrows, to change the order." (L2-090 AC2) */
  readonly dragHelp: Locator;

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
    this.dragHelp = this.main.getByText('Drag a service by its handle, or use the arrows');
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

  /** The handle a service is dragged by: a pointer affordance, hidden from the keyboard and assistive technology. */
  dragHandle(name: string): Locator {
    return this.row(name).locator('.cdk-drag-handle');
  }

  /**
   * Drags the service named `from` by its handle and drops it on the row of `to`, as a hand does: press,
   * move in steps so the drag starts, release.
   */
  async drag(from: string, to: string): Promise<void> {
    const handle = await this.dragHandle(from).boundingBox();
    const source = await this.row(from).boundingBox();
    const target = await this.row(to).boundingBox();
    if (!handle || !source || !target)
      throw new Error('The service to drag, or the place to drop it, is not on screen.');
    const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
    const end = { x: start.x, y: target.y + (start.y - source.y) };
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + 4, start.y + 8, { steps: 4 });
    await this.page.mouse.move(end.x, end.y, { steps: 12 });
    await this.page.mouse.up();
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
