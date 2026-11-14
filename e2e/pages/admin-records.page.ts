import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';

/**
 * A table of the admin application, `/{table}` (L2-276 to L2-281): its heading with the group, the
 * name and the sentence, Export and "New", the search and the columns, the status chips, and the
 * rows as a table from 768 px or a list below it.
 */
/** The Members table with the staff member's menu open (L2-188 AC3). */
export class AdminStaffMenuScreen extends AdminShellPage implements Screen {
  async ready(): Promise<void> {
    // The mock is drawn with the menu open.
    if (await this.staffMenu.isVisible()) return;
    await this.staffButton.click();
    await this.staffMenu.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'staff-menu', locator: this.staffMenu }];
  }
}

export class AdminRecordsPage extends AdminShellPage implements Screen {
  /** The column of the screen, inside `main`. */
  readonly column: Locator;
  /** The heading block: eyebrow, title and lead. */
  readonly headingBlock: Locator;
  /** The heading with Export and New beside it. */
  readonly head: Locator;
  readonly statusPills: Locator;
  readonly eyebrow: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly lockTag: Locator;
  readonly exportButton: Locator;
  readonly newRecord: Locator;
  readonly search: Locator;
  readonly columnsButton: Locator;
  readonly statusChips: Locator;
  /** The card that holds the rows, the empty state or the error. */
  readonly records: Locator;
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly bodyRows: Locator;
  readonly list: Locator;
  readonly listRows: Locator;
  readonly error: Locator;
  readonly empty: Locator;
  readonly foot: Locator;

  constructor(page: Page) {
    super(page);
    this.column = this.main.locator('.admin-page');
    this.headingBlock = this.main.locator('.admin-heading');
    this.head = this.main.locator('.records-head');
    this.statusPills = this.main.locator('.records .status');
    this.eyebrow = this.main.locator('.admin-heading__eyebrow');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('.admin-heading__lead');
    this.lockTag = this.heading.locator('.lock-tag');
    this.exportButton = this.main.getByRole('button', { name: 'Export' });
    this.newRecord = this.main.getByRole('link', { name: /^New / });
    this.search = this.main.getByRole('searchbox');
    this.columnsButton = this.main.getByRole('button', { name: /^Columns/ });
    this.statusChips = this.main.locator('.records-filter .chip');
    this.records = this.main.locator('.records');
    this.table = this.records.locator('.records__table table');
    this.columnHeaders = this.table.locator('thead th');
    this.bodyRows = this.table.locator('tbody tr');
    this.list = this.records.locator('.records__list');
    this.listRows = this.list.locator('.records__row');
    this.error = this.records.getByRole('alert');
    this.empty = this.records.locator('.records__empty');
    this.foot = this.records.locator('.records__foot');
  }

  /** The cells of a row of the table. */
  cells(row: Locator): Locator {
    return row.locator('td');
  }

  /** A row of the table by the name it shows. */
  row(name: string): Locator {
    return this.bodyRows.filter({ hasText: name });
  }

  /** The cell of a row under a column heading. */
  async cell(row: Locator, column: string): Promise<Locator> {
    await row.first().waitFor();
    const headers = await this.columnHeaders.allTextContents();
    const index = headers.findIndex((h) => h.trim() === column);
    if (index < 0) throw new Error(`No column "${column}" in ${headers.join(', ')}`);
    return row.locator('td').nth(index);
  }

  checkbox(row: Locator): Locator {
    return row.getByRole('checkbox');
  }

  retry(): Locator {
    return this.error.getByRole('button', { name: 'Try again' });
  }

  async ready(): Promise<void> {
    await this.heading.waitFor();
  }

  override regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'records-head', locator: this.head },
      { name: 'records', locator: this.records },
    ];
  }
}
