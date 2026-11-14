import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';
import { DeleteRecordsDialog } from './delete-records.dialog';
import { ExportReasonDialog } from './export-reason.dialog';

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
  readonly exportMenu: Locator;
  readonly exportSelected: Locator;
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
  /** The selection: the heading's checkbox and the bar it brings up (L2-280 AC3). */
  readonly selectAll: Locator;
  readonly bulkBar: Locator;
  readonly deleteSelected: Locator;
  readonly bulkCount: Locator;
  readonly setStatus: Locator;
  readonly statusMenu: Locator;
  readonly clearSelection: Locator;

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
    this.exportButton = this.head.getByRole('button', { name: 'Export' });
    this.exportMenu = page.getByRole('menu', { name: 'Export' });
    this.resetColumns = this.columnsMenu.getByRole('menuitem', { name: 'Reset to default' });
    this.range = this.foot.locator('.records__range > span');
    this.rowsButton = this.foot.getByRole('button', { name: /^Rows per page/ });
    this.rowsMenu = page.getByRole('menu', { name: 'Rows per page' });
    this.pages = this.foot.getByRole('navigation', { name: 'Pages' });
    this.previousPage = this.pages.getByRole('button', { name: 'Previous page' });
    this.nextPage = this.pages.getByRole('button', { name: 'Next page' });
    this.pageOf = this.pages.locator('.records__page-of');
    this.goTo = this.pages.getByLabel('Go to');
    this.selectAll = this.table.getByRole('checkbox', { name: 'Select all on this page' });
    this.bulkBar = page.getByRole('region', { name: /^Selected / });
    this.bulkCount = this.bulkBar.locator('.bulk-bar__count');
    this.setStatus = this.bulkBar.getByRole('button', { name: /^Set / });
    this.statusMenu = page.getByRole('menu', { name: /^Set / });
    this.clearSelection = this.bulkBar.getByRole('button', { name: 'Clear selection' });
    this.deleteSelected = this.bulkBar.getByRole('button', { name: 'Delete' });
    this.exportSelected = this.bulkBar.getByRole('button', { name: 'Export' });
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

  /** The actions of a row, "Actions for {name}" (L2-280 AC1). */
  rowActions(name: string): Locator {
    return this.table.getByRole('button', { name: `Actions for ${name}` });
  }

  rowMenu(name: string): Locator {
    return this.page.getByRole('menu', { name: `Actions for ${name}` });
  }

  async openRowMenu(name: string): Promise<Locator> {
    await this.rowActions(name).click();
    const menu = this.rowMenu(name);
    await menu.waitFor();
    return menu;
  }

  /** Opens Export and chooses an item of its menu (L2-279 AC1). */
  async exportAs(item: string | RegExp): Promise<void> {
    await this.exportButton.click();
    await this.exportMenu.getByRole('menuitem', { name: item }).click();
  }

  /** Opens Export and gives where its menu lands once it has finished opening (L2-279 AC1). */
  async openExportMenu(): Promise<{ x: number; width: number }> {
    await this.exportButton.click();
    await this.exportMenu.waitFor();
    await this.exportMenu.evaluate((menu) =>
      Promise.all(menu.getAnimations({ subtree: true }).map((animation) => animation.finished)),
    );
    const box = await this.exportMenu.boundingBox();
    return { x: box!.x, width: box!.width };
  }

  /** Checks the rows with these names, in the table or, under 768 px, the list (L2-280 AC3). */
  async select(...names: string[]): Promise<void> {
    for (const name of names) {
      await this.records.getByRole('checkbox', { name: `Select ${name}`, exact: true }).check();
    }
  }

  async setStatusTo(word: string): Promise<void> {
    await this.setStatus.click();
    await this.statusMenu.getByRole('menuitem', { name: word, exact: true }).click();
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

/** The Members table with the actions of Mara Okafor's row open (L2-280 AC1). */
export class AdminRowMenuScreen extends AdminRecordsPage {
  readonly menu = this.rowMenu('Mara Okafor');

  override async ready(): Promise<void> {
    await super.ready();
    if (await this.menu.isVisible()) return; // the mock is drawn open
    await this.openRowMenu('Mara Okafor');
  }

  override regions(): Region[] {
    return [{ name: 'row-menu', locator: this.menu }];
  }
}

/** The Members table with two rows selected and the bar at its foot (L2-280 AC3). */
export class AdminSelectedScreen extends AdminRecordsPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.bulkBar.isVisible()) return; // the mock is drawn selected
    await this.select('Mara Okafor', 'Daniel Mensah');
    await this.bulkBar.waitFor();
  }

  override regions(): Region[] {
    return [
      { name: 'records', locator: this.records },
      { name: 'bulk-bar', locator: this.bulkBar },
    ];
  }
}

/** Two rows selected with "Set status" open upward (L2-280 AC4). */
export class AdminBulkStatusMenuScreen extends AdminSelectedScreen {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.statusMenu.isVisible()) return; // the mock is drawn open
    await this.setStatus.click();
    await this.statusMenu.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'status-menu', locator: this.statusMenu }];
  }
}

/** The Members table with Export open (L2-279 AC1). */
export class AdminExportMenuScreen extends AdminRecordsPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.exportMenu.isVisible()) return; // the mock is drawn open
    await this.exportButton.click();
    await this.exportMenu.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'export-menu', locator: this.exportMenu }];
  }
}

/** The Export menu once "Email me this weekly" is on: it offers to stop it (L2-279 AC3). */
export class AdminExportWeeklyScreen extends AdminRecordsPage {
  override async ready(): Promise<void> {
    await super.ready();
    if (await this.exportMenu.isVisible()) return; // the mock is drawn open
    await this.exportAs('Email me this weekly');
    await this.exportButton.click();
    await this.exportMenu.getByRole('menuitem', { name: 'Stop the weekly email' }).waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'export-menu', locator: this.exportMenu }];
  }
}

/** "CSV, every message" chosen in the Messages table: the dialog asks why (L2-279 AC4). */
export class AdminExportReasonScreen extends AdminRecordsPage {
  readonly dialog = new ExportReasonDialog(this.page);

  override async ready(): Promise<void> {
    if (await this.dialog.title.isVisible()) return; // the mock is drawn open
    await super.ready();
    // Chosen with the keyboard, as the mock draws the reason field focused.
    await this.exportButton.click();
    await this.exportMenu.getByRole('menuitem', { name: /^CSV, every message/ }).focus();
    await this.page.keyboard.press('Enter');
    await this.dialog.title.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'export-reason', locator: this.dialog.root.locator('.dialog__panel') }];
  }
}

/** Mara Okafor's "Delete" chosen from her row's actions (L2-281 AC1). */
export class AdminConfirmDeleteOneScreen extends AdminRecordsPage {
  readonly dialog = new DeleteRecordsDialog(this.page);

  override async ready(): Promise<void> {
    await super.ready();
    if (await this.dialog.title.isVisible()) return; // the mock is drawn open
    const menu = await this.openRowMenu('Mara Okafor');
    await menu.getByRole('menuitem', { name: 'Delete' }).click();
    await this.dialog.title.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'delete-dialog', locator: this.dialog.root.locator('.dialog__panel') }];
  }
}

/** Two rows selected and "Delete" chosen in the bar: "Type delete to confirm" (L2-281 AC2). */
export class AdminConfirmDeleteScreen extends AdminSelectedScreen {
  readonly dialog = new DeleteRecordsDialog(this.page);

  override async ready(): Promise<void> {
    if (await this.dialog.title.isVisible()) return; // the mock is drawn open
    await super.ready();
    await this.deleteSelected.click();
    await this.dialog.title.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'delete-dialog', locator: this.dialog.root.locator('.dialog__panel') }];
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
