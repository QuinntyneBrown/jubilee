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
import { ADMIN_TABLES_API, AdminRows, errorReference, LoadState } from 'api';
import {
  AdminHeading,
  AdminPage,
  Button,
  EmptyState,
  Icon,
  LockTag,
  RecordsColumn,
  RecordsEmpty,
  RecordsFilter,
  RecordsHead,
  RecordsSort,
  RecordsTable,
  RecordsTools,
} from 'components';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { AdminCatalogService } from '../../services/admin-catalog.service';
import { AdminScreenService } from '../../services/admin-screen.service';
import { StaffSessionService } from '../../services/staff-session.service';
import { AdminOnlyPage } from '../admin-only/admin-only.page';
import { NotFoundPage } from '../not-found/not-found.page';

/**
 * A table of Jubilee's records, `/{table}` (L2-276): any table of the catalog, drawn from its
 * description: its group, name and sentence, Export and "New", the search, the status chips and
 * its rows in the table's default columns, sorted by any of them. The server searches, filters and
 * sorts every record of the table (L2-277 AC6). A table the role may not read, or that does not
 * exist, says so (L2-188 AC4, AC7).
 */
@Component({
  selector: 'jb-records-page',
  imports: [
    RouterLink,
    AdminHeading,
    AdminPage,
    Button,
    EmptyState,
    Icon,
    LockTag,
    RecordsFilter,
    RecordsHead,
    RecordsTable,
    RecordsTools,
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

  protected readonly key = signal('');
  protected readonly state = signal<LoadState<AdminRows>>({ status: 'loading' });
  protected readonly refused = signal<'forbidden' | 'not-found' | null>(null);
  protected readonly q = signal('');
  protected readonly status = signal<string | null>(null);
  protected readonly sort = signal<RecordsSort | null>(null);
  private reading?: Subscription;

  protected readonly table = computed(() => this.catalog.table(this.key()));

  protected readonly columns = computed<RecordsColumn[]>(() => {
    const table = this.table();
    if (!table) return [];
    return table.defaultColumns
      .map((key) => table.fields.find((f) => f.key === key))
      .filter((f) => !!f)
      .map((f) => ({ key: f.key, label: f.label, type: f.type, sortable: f.sortable }));
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
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => params.get('table') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((key) => {
        this.key.set(key);
        this.q.set('');
        this.status.set(null);
        this.sort.set(null);
        this.load();
      });
  }

  protected search(q: string): void {
    this.q.set(q);
    this.load();
  }

  protected filter(status: string | null): void {
    this.status.set(status);
    this.load();
  }

  protected sortBy(sort: RecordsSort | null): void {
    this.sort.set(sort);
    this.load();
  }

  protected clear(): void {
    this.q.set('');
    this.status.set(null);
    this.load();
  }

  /** Reads the first page of rows for the search, the status and the sort; a newer read replaces an older one. */
  protected load(): void {
    const key = this.key();
    const sort = this.sort();
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
        page: 1,
        size: 25,
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
