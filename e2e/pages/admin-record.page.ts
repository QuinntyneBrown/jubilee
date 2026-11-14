import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/**
 * One record of the admin application, `/{table}/{id}` (L2-282): the breadcrumb, the name with its
 * status and ID, its fields and system line, and beside them "Points here" and "History".
 */
export class AdminRecordPage extends AdminShellPage implements Screen {
  readonly column: Locator;
  readonly crumbs: Locator;
  readonly back: Locator;
  readonly here: Locator;
  readonly head: Locator;
  readonly heading: Locator;
  readonly status: Locator;
  readonly copyId: Locator;
  readonly lockTag: Locator;
  readonly grid: Locator;
  readonly fields: Locator;
  readonly system: Locator;
  readonly aside: Locator;
  readonly pointers: Locator;
  readonly noPointers: Locator;
  readonly history: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.column = this.main.locator('.admin-page');
    this.crumbs = this.main.getByRole('navigation', { name: 'Breadcrumb' });
    this.back = this.crumbs.getByRole('link');
    this.here = this.crumbs.locator('[aria-current="page"]');
    this.head = this.main.locator('.record-head');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.status = this.head.locator('.status');
    this.copyId = this.head.getByRole('button', { name: /^Copy ID / });
    this.lockTag = this.head.locator('.lock-tag');
    this.grid = this.main.locator('.record-grid');
    this.fields = this.main.locator('.record-fields');
    this.system = this.main.locator('.record-system');
    this.aside = this.main.getByRole('complementary', { name: 'Related and history' });
    this.pointers = this.aside.locator('.backlinks li');
    this.noPointers = this.aside.getByText('No other records reference this one.');
    this.history = this.aside.locator('.history li');
    this.error = this.main.getByRole('alert');
  }

  /** The value of a field by its label. */
  field(label: string): Locator {
    return this.fields
      .locator('.record-fields__row')
      .filter({ has: this.page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
      .locator('dd');
  }

  retry(): Locator {
    return this.error.getByRole('button', { name: 'Try again' });
  }

  async ready(): Promise<void> {
    await this.crumbs.waitFor();
  }

  override regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'record-crumbs', locator: this.crumbs },
      { name: 'record-head', locator: this.head },
    ];
  }
}
