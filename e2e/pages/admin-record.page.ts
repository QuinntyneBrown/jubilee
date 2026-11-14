import type { Locator, Page } from '@playwright/test';
import type { Region, Screen } from '../fixtures/visual';
import { AdminShellPage } from './admin-shell.page';
import { DeleteRecordsDialog } from './delete-records.dialog';

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
  readonly edit: Locator;
  readonly delete: Locator;
  readonly cancel: Locator;
  readonly save: Locator;
  readonly saved: Locator;
  /** What the record says above its fields: a private read, a System table, one's own listing (L2-284). */
  readonly note: Locator;
  /** A message that does not open: "This message is private" (L2-284 AC3). */
  readonly closed: Locator;
  readonly closedBack: Locator;

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
    this.edit = this.head.getByRole('link', { name: 'Edit' });
    this.delete = this.head.getByRole('button', { name: 'Delete' });
    this.cancel = this.head.getByRole('link', { name: 'Cancel' });
    this.save = this.head.getByRole('button', { name: /^(Save changes|Saving…)$/ });
    this.saved = this.head.getByRole('status');
    this.note = this.column.locator('.record-note');
    this.closed = this.column.locator('.empty');
    this.closedBack = this.closed.getByRole('link');
  }

  /** The value of a field by its label. */
  field(label: string): Locator {
    return this.fields
      .locator('.record-fields__row')
      .filter({ has: this.page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
      .locator('dd');
  }

  /** The editor of a field, by its label (L2-283 AC1). */
  editor(label: string): Locator {
    return this.fields.getByLabel(label, { exact: true });
  }

  /** What is wrong with a field, after a refusal (L2-283 AC2). */
  fieldError(label: string): Locator {
    return this.fields
      .locator('.record-fields__row')
      .filter({ has: this.page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
      .locator('.field__error');
  }

  /** "Create {singular}", on a new record (L2-283 AC4). */
  create(singular: string): Locator {
    return this.head.getByRole('button', { name: new RegExp(`^(Create ${singular}|Creating…)$`) });
  }

  /** Changes a field and saves the record, as a staff member does (L2-283 AC2). */
  async change(label: string, value: string): Promise<void> {
    await this.editor(label).fill(value);
    await this.save.click();
  }

  /** The saving state the mock draws: a field typed over with its own value, then saved. */
  async saveAsDrawn(): Promise<void> {
    const neighbourhood = this.editor('Neighbourhood');
    await this.change('Neighbourhood', await neighbourhood.inputValue());
    await this.save.filter({ hasText: 'Saving…' }).waitFor();
  }

  /** The saved state the mock draws: the neighbourhood changed to Riverdale and saved. */
  async saveRiverdale(): Promise<void> {
    await this.change('Neighbourhood', 'Riverdale');
    await this.saved.waitFor();
    // The pointer stays where "Save changes" was, now over "Edit"; the mock draws no hover.
    await this.page.mouse.move(0, 0);
  }

  retry(): Locator {
    return this.error.getByRole('button', { name: 'Try again' });
  }

  async ready(): Promise<void> {
    await this.crumbs.waitFor();
    await this.head.waitFor();
  }

  override regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'record-crumbs', locator: this.crumbs },
      { name: 'record-head', locator: this.head },
    ];
  }
}

/** Mara Okafor's record with "Delete" pressed (L2-281 AC1). */
export class AdminRecordConfirmDeleteScreen extends AdminRecordPage {
  readonly dialog = new DeleteRecordsDialog(this.page);

  override async ready(): Promise<void> {
    if (await this.dialog.title.isVisible()) return; // the mock is drawn open
    await super.ready();
    await this.delete.click();
    await this.dialog.title.waitFor();
  }

  override regions(): Region[] {
    return [{ name: 'delete-dialog', locator: this.dialog.root.locator('.dialog__panel') }];
  }
}

/** A message whose conversation has no open report: "This message is private" (L2-284 AC3). */
export class AdminRecordPrivateScreen extends AdminRecordPage {
  override async ready(): Promise<void> {
    await this.crumbs.waitFor();
    await this.closed.waitFor();
  }

  override regions(): Region[] {
    return [
      ...this.chromeRegions(),
      { name: 'record-crumbs', locator: this.crumbs },
      { name: 'private', locator: this.closed },
    ];
  }
}
