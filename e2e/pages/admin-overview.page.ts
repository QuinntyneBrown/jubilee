import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/**
 * The overview of the admin application, `/` (L2-274, L2-275): the day and the greeting with what
 * is waiting on staff, the work queue in its sections, and beside it System and Recent changes.
 */
export class AdminOverviewPage extends AdminShellPage implements Screen {
  readonly column: Locator;
  /** The day, the greeting and "Since yesterday". */
  readonly headingBlock: Locator;
  readonly day: Locator;
  readonly heading: Locator;
  readonly since: Locator;
  /** The work queue: "Safety", "Waiting on us", or "All clear". */
  readonly queues: Locator;
  readonly queueTitles: Locator;
  readonly lines: Locator;
  readonly clear: Locator;
  readonly error: Locator;
  readonly retry: Locator;
  /** The work queue and, from 1024 px, the aside beside it. */
  readonly grid: Locator;
  /** System and Recent changes, beside the work queue. */
  readonly aside: Locator;
  readonly systemSection: Locator;
  readonly changesSection: Locator;
  readonly system: Locator;
  readonly systemItems: Locator;
  readonly changes: Locator;
  readonly changeItems: Locator;
  readonly auditLog: Locator;

  constructor(page: Page) {
    super(page);
    this.column = this.main.locator('.admin-page');
    this.headingBlock = this.main.locator('.admin-heading');
    this.day = this.headingBlock.locator('.admin-heading__eyebrow');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.since = this.headingBlock.locator('.admin-heading__lead');
    this.queues = this.main.locator('.work-queue');
    this.queueTitles = this.queues.locator('.work-queue__title');
    this.lines = this.queues.locator('.work-queue__item');
    this.clear = this.queues.locator('.work-queue__clear');
    this.error = this.main.getByRole('alert');
    this.retry = this.error.getByRole('button', { name: 'Try again' });
    this.grid = this.main.locator('.work-grid');
    this.aside = this.main.getByRole('complementary', { name: 'System and recent changes' });
    this.systemSection = this.aside.locator('section').filter({
      has: page.getByRole('heading', { name: 'System' }),
    });
    this.changesSection = this.aside.locator('section').filter({
      has: page.getByRole('heading', { name: 'Recent changes' }),
    });
    this.system = this.aside.locator('.system-list');
    this.systemItems = this.system.locator('.system-list__item');
    this.changes = this.aside.locator('.change-list');
    this.changeItems = this.changes.locator('li');
    this.auditLog = this.aside.getByRole('link', { name: 'Audit log' });
  }

  /** The section of the work queue under a title. */
  queue(title: string): Locator {
    return this.queues.filter({ has: this.page.getByRole('heading', { name: title }) });
  }

  /** The line of the work queue for a table, by its name. */
  line(name: string): Locator {
    return this.lines.filter({ has: this.page.locator('.work-queue__name', { hasText: name }) });
  }

  /** The name of a line, which opens the oldest record waiting. */
  open(name: string): Locator {
    return this.line(name).locator('.work-queue__open');
  }

  /** "Next: {the oldest record waiting}" of a line. */
  next(name: string): Locator {
    return this.line(name).locator('.work-queue__next');
  }

  /** The control "See all {name}, {n} waiting" of a line: the age and the count. */
  all(name: string): Locator {
    return this.line(name).getByRole('link', { name: /^See all / });
  }

  age(name: string): Locator {
    return this.line(name).locator('.work-queue__age');
  }

  count(name: string): Locator {
    return this.line(name).locator('.work-queue__count');
  }

  /** An item of System by the state its icon names. */
  systemItem(state: string): Locator {
    return this.systemItems.filter({ has: this.page.getByRole('img', { name: state }) });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  override regions(): Region[] {
    return [
      { name: 'greeting', locator: this.headingBlock },
      { name: 'work-queue', locator: this.queues.first() },
      { name: 'aside', locator: this.aside },
    ];
  }
}

/** The overview while it loads: the heading stays and the lines are skeletons (L2-274 AC6). */
export class AdminOverviewLoadingScreen extends AdminOverviewPage {
  override async ready(): Promise<void> {
    await this.column.and(this.page.locator('[aria-busy="true"]')).waitFor();
  }
}

/** The overview when it fails: "We couldn’t load what is waiting on staff" (L2-274 AC6). */
export class AdminOverviewErrorScreen extends AdminOverviewPage {
  override async ready(): Promise<void> {
    await this.error.waitFor();
  }

  override regions(): Region[] {
    return [
      { name: 'greeting', locator: this.headingBlock },
      { name: 'error', locator: this.error },
    ];
  }
}

/** The overview under 1024 px with the drawer of tables open (L2-272 AC4). */
export class AdminOverviewDrawerScreen extends AdminOverviewPage {
  override async ready(): Promise<void> {
    await this.heading.waitFor();
    if (!(await this.drawer.isVisible())) await this.openTables.click();
    await this.drawer.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'drawer', locator: this.drawer.locator('.admin-drawer__panel') }];
  }
}
