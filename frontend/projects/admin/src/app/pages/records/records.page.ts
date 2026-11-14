import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ADMIN_PAGE_SIZES,
  ADMIN_TABLES_API,
  AdminRows,
  AdminTable,
  errorReference,
  LoadState,
} from 'api';
import {
  AdminHeading,
  AdminPage,
  BulkBar,
  Button,
  EmptyState,
  ExportChoice,
  ExportMenu,
  Icon,
  LockTag,
  RecordsColumn,
  RecordsColumnChoice,
  RecordsEmpty,
  RecordsFilter,
  RecordsFoot,
  RecordsHead,
  RecordsRow,
  RecordsSort,
  RecordsTable,
  RecordsTools,
  ToastService,
} from 'components';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { AdminCatalogService } from '../../services/admin-catalog.service';
import { AdminDeletionService } from '../../services/admin-deletion.service';
import { AdminExportService } from '../../services/admin-export.service';
import { AdminPreferencesService } from '../../services/admin-preferences.service';
import { AdminScreenService } from '../../services/admin-screen.service';
import { StaffSessionService } from '../../services/staff-session.service';
import { AdminOnlyPage } from '../admin-only/admin-only.page';
import { NotFoundPage } from '../not-found/not-found.page';

/**
 * A table of Jubilee's records, `/{table}` (L2-276): any table of the catalog, drawn from its
 * description: its group, name and sentence, Export and "New", the search, the status chips and
 * its rows in the table's default columns, sorted by any of them. The server searches, filters and
 * sorts every record of the table (L2-277 AC6). The staff member chooses the columns and the rows
 * per page, kept for the table in this browser (L2-278), and turns the pages. A table the role may
 * not read, or that does not exist, says so (L2-188 AC4, AC7).
 */
@Component({
  selector: 'jb-records-page',
  imports: [
    RouterLink,
    AdminHeading,
    AdminPage,
    Button,
    EmptyState,
    ExportMenu,
    Icon,
    LockTag,
    RecordsFilter,
    RecordsFoot,
    RecordsHead,
    RecordsTable,
    RecordsTools,
    BulkBar,
    AdminOnlyPage,
    NotFoundPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './records.page.html',
})
export class RecordsPage {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly catalog = inject(AdminCatalogService);
  private readonly screen = inject(AdminScreenService);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly session = inject(StaffSessionService);
  private readonly preferences = inject(AdminPreferencesService);
  private readonly toasts = inject(ToastService);
  private readonly deletion = inject(AdminDeletionService);
  private readonly exporter = inject(AdminExportService);
  private readonly route = inject(ActivatedRoute);

  protected readonly key = signal('');
  protected readonly state = signal<LoadState<AdminRows>>({ status: 'loading' });
  protected readonly refused = signal<'forbidden' | 'not-found' | null>(null);
  protected readonly q = signal('');
  protected readonly status = signal<string | null>(null);
  protected readonly sort = signal<RecordsSort | null>(null);
  protected readonly page = signal(1);
  protected readonly size = signal<number>(ADMIN_PAGE_SIZES[0]);
  /** The columns the staff member chose, or null for the table's defaults. */
  private readonly chosenColumns = signal<string[] | null>(null);
  private reading?: Subscription;
  /** The IDs of the checked rows (L2-280 AC3). */
  protected readonly selected = signal<readonly string[]>([]);

  protected readonly table = computed(() => this.catalog.table(this.key()));

  /** How many rows the search and the filter match, or null when neither is on (L2-279 AC1). */
  protected readonly matching = computed(() =>
    this.q().trim() || this.status() ? this.total() : null,
  );

  /** The keys of the columns shown: the staff member's choice of the table's fields, else its defaults. */
  private readonly shownKeys = computed(() => {
    const table = this.table();
    if (!table) return [];
    const chosen = this.chosenColumns()?.filter((key) => table.fields.some((f) => f.key === key));
    return chosen?.length ? chosen : table.defaultColumns;
  });

  protected readonly columns = computed<RecordsColumn[]>(() => {
    const table = this.table();
    if (!table) return [];
    const shown = this.shownKeys();
    const chosen = this.chosenColumns() !== null;
    const keys = chosen
      ? table.fields.map((f) => f.key).filter((key) => shown.includes(key))
      : shown;
    return keys
      .map((key) => table.fields.find((f) => f.key === key))
      .filter((f) => !!f)
      .map((f) => ({ key: f.key, label: f.label, type: f.type, sortable: f.sortable }));
  });

  /** Every field, for the Columns menu (L2-278 AC1). */
  protected readonly columnChoices = computed<RecordsColumnChoice[]>(() => {
    const shown = this.shownKeys();
    return (this.table()?.fields ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      shown: shown.includes(f.key),
    }));
  });

  protected readonly total = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value.total : 0;
  });

  /** The status field, when the role may set it on the selected rows (L2-280 AC4). */
  protected readonly settable = computed(() => {
    const table = this.table();
    return table?.fields.find((f) => f.key === table.statusField && f.editable) ?? null;
  });

  /** The status field and its values, for the chips (L2-277 AC2). */
  protected readonly statusField = computed(() => {
    const table = this.table();
    const field = table?.fields.find((f) => f.key === table.statusField);
    return field?.options?.length ? field : null;
  });

  /** What the table says with no rows: nothing matches, or nothing yet (L2-277 AC3, L2-099 AC4). */
  protected readonly empty = computed<RecordsEmpty | null>(() => {
    const table = this.table();
    if (!table) return null;
    const unit = table.label.toLowerCase();
    const q = this.q().trim();
    if (q || this.status()) {
      return {
        title: q ? `No ${unit} match “${q}”` : `No ${unit} match these filters`,
        text: 'Search looks at every field, including IDs and emails.',
        action: 'Clear search and filters',
      };
    }
    return { title: `No ${unit} yet`, text: table.empty ?? '' };
  });

  protected readonly errorReference = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.reference : null;
  });

  protected readonly rows = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value.rows : [];
  });

  constructor() {
    effect(() => {
      const table = this.table();
      if (table) this.title.setTitle(`${table.label} · Jubilee admin`);
    });
    // The link of the weekly e-mail, `?export=csv`, downloads every record once (L2-279 AC3).
    let linked = this.route.snapshot.queryParamMap.get('export') === 'csv';
    effect(() => {
      const table = this.table();
      if (!linked || !table) return;
      linked = false;
      this.exporter.download(table, { format: 'csv' });
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { export: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
    this.route.paramMap
      .pipe(
        map((params) => params.get('table') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((key) => {
        const kept = this.preferences.read(key);
        this.key.set(key);
        this.q.set('');
        this.status.set(null);
        this.sort.set(null);
        this.page.set(1);
        this.chosenColumns.set(Array.isArray(kept.columns) ? kept.columns : null);
        this.size.set(ADMIN_PAGE_SIZES.find((n) => n === kept.size) ?? ADMIN_PAGE_SIZES[0]);
        this.load();
      });
    // "Undo" brought records of this table back: read the rows again (L2-281 AC3).
    this.deletion.restored.pipe(takeUntilDestroyed()).subscribe((key) => {
      if (key === this.key()) this.load();
    });
  }

  protected search(q: string): void {
    this.q.set(q);
    this.page.set(1);
    this.load();
  }

  protected filter(status: string | null): void {
    this.status.set(status);
    this.page.set(1);
    this.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  /** Rows per page: shows that many from page 1, and keeps the choice (L2-278 AC3, AC5). */
  protected showRows(size: number): void {
    this.size.set(size);
    this.page.set(1);
    this.preferences.write(this.key(), { size });
    this.load();
  }

  /** Shows or hides a column; the last one shown stays (L2-278 AC1, AC5). */
  protected toggleColumn(key: string): void {
    const shown = this.shownKeys();
    const next = shown.includes(key) ? shown.filter((k) => k !== key) : [...shown, key];
    if (next.length === 0) return;
    this.chosenColumns.set(next);
    this.preferences.write(this.key(), { columns: next });
  }

  protected resetColumns(): void {
    this.chosenColumns.set(null);
    this.preferences.write(this.key(), { columns: undefined });
  }

  protected sortBy(sort: RecordsSort | null): void {
    this.sort.set(sort);
    this.load();
  }

  protected clear(): void {
    this.q.set('');
    this.status.set(null);
    this.page.set(1);
    this.load();
  }

  /** Reads the page of rows for the search, the status and the sort; a newer read replaces an older one. */
  protected copied(): void {
    this.toasts.show({ tone: 'success', title: 'ID copied', text: '' });
  }

  /** A new record with the row's values but its ID and system fields (L2-280 AC2). */
  protected duplicate(row: RecordsRow): void {
    void this.router.navigate(['/', this.key(), 'new'], { state: { copy: row.values } });
  }

  /** Sets the status on every selected row, then reads the page again (L2-280 AC4). */
  protected setStatus(word: string): void {
    const ids = this.selected();
    this.api.setStatus(this.key(), ids, word).subscribe({
      next: ({ count }) => {
        this.toasts.show({ tone: 'success', title: `${count} set to ${word}`, text: '' });
        this.selected.set([]);
        this.load();
      },
      error: (error: unknown) =>
        this.toasts.show({
          tone: 'danger',
          title: `We couldn’t set ${word}`,
          text: `Nothing was changed. If it keeps happening, tell us and quote ${errorReference(error, 'JB-ADM-504')}.`,
        }),
    });
  }

  /** Asks, then deletes the rows and reads the page again (L2-281 AC1, AC3). */
  protected remove(table: AdminTable, rows: readonly RecordsRow[]): void {
    this.deletion
      .ask(
        table,
        rows.map((r) => ({ id: r.id, name: r.name })),
      )
      .subscribe(() => this.load());
  }

  /** "Delete" in the bar: the selected rows of the page (L2-281 AC2). */
  protected removeSelected(table: AdminTable): void {
    const ids = this.selected();
    this.remove(
      table,
      this.rows().filter((r) => ids.includes(r.id)),
    );
  }

  /** Downloads the file Export's menu chose: every record, or the rows matching (L2-279 AC1, AC2). */
  protected download(table: AdminTable, choice: ExportChoice): void {
    const q = this.q().trim();
    const status = this.status();
    this.exporter.download(
      table,
      choice.matching
        ? { format: choice.format, q: q || undefined, status: status ?? undefined }
        : { format: choice.format },
    );
  }

  /** "Export" in the bar: the selected rows, as CSV (L2-279 AC2). */
  protected downloadSelected(table: AdminTable): void {
    this.exporter.download(table, { format: 'csv', ids: this.selected() });
  }

  protected weekly(table: AdminTable, on: boolean): void {
    this.exporter.weekly(table, on);
  }

  protected load(): void {
    const key = this.key();
    const sort = this.sort();
    // A selection names rows of the page shown; another page, search or order starts afresh.
    this.selected.set([]);
    this.state.set({ status: 'loading' });
    this.refused.set(null);
    this.screen.outcome.set(null);
    this.reading?.unsubscribe();
    this.reading = this.api
      .rows(key, {
        q: this.q().trim(),
        status: this.status() ?? undefined,
        sort: sort?.key,
        dir: sort?.dir,
        page: this.page(),
        size: this.size(),
      })
      .subscribe({
        next: (rows) => {
          this.state.set({ status: 'loaded', value: rows });
        },
        error: (error: unknown) => {
          const status = error instanceof HttpErrorResponse ? error.status : 0;
          if (status === 403 || status === 404) {
            this.refused.set(status === 403 ? 'forbidden' : 'not-found');
            this.screen.outcome.set(status === 403 ? 'admin-only' : 'admin-not-found');
            return;
          }
          this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-503') });
        },
      });
  }

  protected signOut(): void {
    this.session.signOut().subscribe(() => void this.router.navigate(['/signed-out']));
  }
}
