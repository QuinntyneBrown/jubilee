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
  /** The search and the Columns menu. */
  readonly tools: Locator;
  readonly search: Locator;
  readonly columnsButton: Locator;
  readonly statusChips: Locator;
  /** The group of status chips, named "Filter by {status field}". */
  readonly statusFilter: Locator;
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
  /** The Columns menu, "Show in table" (L2-278 AC1). */
  readonly columnsMenu: Locator;
  readonly resetColumns: Locator;
  /** "{from}–{to} of {total}" in the foot. */
  readonly range: Locator;
  readonly rowsButton: Locator;
  readonly rowsMenu: Locator;
  readonly pages: Locator;
  readonly previousPage: Locator;
  readonly nextPage: Locator;
  /** "Page {n} of {pages}", under 640 px. */
  readonly pageOf: Locator;
  readonly goTo: Locator;

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
    this.tools = this.main.locator('.records-tools');
    this.search = this.main.getByRole('searchbox');
    this.columnsButton = this.main.getByRole('button', { name: /^Columns/ });
    this.statusChips = this.main.locator('.records-filter .chip');
    this.statusFilter = this.main.getByRole('group', { name: /^Filter by / });
    this.records = this.main.locator('.records');
    this.table = this.records.locator('.records__table table');
    this.columnHeaders = this.table.locator('thead th');
    this.bodyRows = this.table.locator('tbody tr');
    this.list = this.records.locator('.records__list');
    this.listRows = this.list.locator('.records__row');
    this.error = this.records.getByRole('alert');
    this.empty = this.records.locator('.records__empty');
    this.foot = this.records.locator('.records__foot');
    this.columnsMenu = page.getByRole('menu', { name: 'Columns' });
    this.resetColumns = this.columnsMenu.getByRole('menuitem', { name: 'Reset to default' });
    this.range = this.foot.locator('.records__range > span');
    this.rowsButton = this.foot.getByRole('button', { name: /^Rows per page/ });
    this.rowsMenu = page.getByRole('menu', { name: 'Rows per page' });
    this.pages = this.foot.getByRole('navigation', { name: 'Pages' });
    this.previousPage = this.pages.getByRole('button', { name: 'Previous page' });
    this.nextPage = this.pages.getByRole('button', { name: 'Next page' });
    this.pageOf = this.pages.locator('.records__page-of');
    this.goTo = this.pages.getByLabel('Go to');
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

  /** A status chip by its words ("All", "Active"). */
  chip(name: string): Locator {
    return this.statusFilter.getByRole('button', { name, exact: true });
  }

  /** The heading cell of a column, which says how the table is sorted (`aria-sort`). */
  header(column: string): Locator {
    return this.table.locator('thead th').filter({
      // The arrow of a sorted column is part of the button's name.
      has: this.page.getByRole('button', { name: new RegExp(`^${column}(?: [↑↓])?$`) }),
    });
  }

  /** Sorts by a column: ascending, then descending, then not at all (L2-277 AC5). */
  async sortBy(column: string): Promise<void> {
    await this.header(column).getByRole('button').click();
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
  }

  clearSearchAndFilters(): Locator {
    return this.empty.first().getByRole('button', { name: 'Clear search and filters' });
  }

  /** A field in the Columns menu, a checkbox that shows or hides its column. */
  columnChoice(label: string): Locator {
    return this.columnsMenu.getByRole('menuitemcheckbox', { name: label, exact: true });
  }

  async openColumns(): Promise<void> {
    await this.columnsButton.click();
    await this.columnsMenu.waitFor();
  }

  /** Shows or hides a column through the Columns menu, which closes after each choice. */
  async toggleColumn(label: string): Promise<void> {
    if (!(await this.columnsMenu.isVisible())) await this.openColumns();
    await this.columnChoice(label).click();
  }

  rowsChoice(size: number): Locator {
    return this.rowsMenu.getByRole('menuitemradio', { name: String(size), exact: true });
  }

  async showRows(size: number): Promise<void> {
    await this.rowsButton.click();
    await this.rowsChoice(size).click();
  }

  pageButton(page: number): Locator {
    return this.pages.getByRole('button', { name: String(page), exact: true });
  }

  async goToPage(page: number): Promise<void> {
    await this.goTo.fill(String(page));
    await this.goTo.press('Enter');
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

/** The Members table with the Columns menu open (L2-278 AC1). */
export class AdminColumnsMenuScreen extends AdminRecordsPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.columnsMenu.isVisible()) return; // the mock is drawn open
    await this.openColumns();
  }

  override regions(): Region[] {
    return [{ name: 'columns-menu', locator: this.columnsMenu }];
  }
}

/** The Members table with the Rows per page menu open (L2-278 AC3). */
export class AdminRowsMenuScreen extends AdminRecordsPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.rowsMenu.isVisible()) return; // the mock is drawn open
    await this.rowsButton.click();
    await this.rowsMenu.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'rows-menu', locator: this.rowsMenu }];
  }
}
