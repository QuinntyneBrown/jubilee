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
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_TABLES_API, AdminRecord, errorReference, LoadState } from 'api';
import {
  AdminPage,
  Button,
  EmptyState,
  formatAdminDate,
  Icon,
  LockTag,
  RecordAside,
  RecordCrumbs,
  RecordFields,
  RecordGrid,
  RecordHead,
  RecordHistoryLine,
  RecordsColumn,
  RecordSystem,
  RecordSystemValue,
  ToastService,
} from 'components';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { AdminCatalogService } from '../../services/admin-catalog.service';
import { AdminScreenService } from '../../services/admin-screen.service';
import { StaffSessionService } from '../../services/staff-session.service';
import { AdminOnlyPage } from '../admin-only/admin-only.page';
import { NotFoundPage } from '../not-found/not-found.page';

/**
 * One record of any table, `/{table}/{id}` (L2-282): the way back to its table, its name with its
 * status and ID, its fields by type and its system values, and beside them what points at it and
 * its history. A record that does not exist, or a table the role may not read, says so (L2-188).
 */
@Component({
  selector: 'jb-record-page',
  imports: [
    AdminPage,
    Button,
    EmptyState,
    Icon,
    LockTag,
    RecordAside,
    RecordCrumbs,
    RecordFields,
    RecordGrid,
    RecordHead,
    RecordSystem,
    AdminOnlyPage,
    NotFoundPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './record.page.html',
})
export class RecordPage {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly catalog = inject(AdminCatalogService);
  private readonly screen = inject(AdminScreenService);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly session = inject(StaffSessionService);
  private readonly toasts = inject(ToastService);
  private reading?: Subscription;

  protected readonly key = signal('');
  protected readonly id = signal('');
  protected readonly state = signal<LoadState<AdminRecord>>({ status: 'loading' });
  protected readonly refused = signal<'forbidden' | 'not-found' | null>(null);

  protected readonly table = computed(() => this.catalog.table(this.key()));
  protected readonly singular = computed(() => this.table()?.singular.toLowerCase() ?? 'record');

  protected readonly record = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly errorReference = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.reference : null;
  });

  /** The fields a staff member reads and changes; the system ones go in the line below (L2-282 AC3). */
  protected readonly fields = computed<RecordsColumn[]>(() =>
    (this.table()?.fields ?? [])
      .filter((f) => !f.system)
      .map((f) => ({ key: f.key, label: f.label, type: f.type })),
  );

  protected readonly system = computed<RecordSystemValue[]>(() => {
    const record = this.record();
    if (!record) return [];
    return (this.table()?.fields ?? [])
      .filter((f) => f.system && record.values[f.key] != null)
      .map((f) => {
        const value = String(record.values[f.key]);
        return f.type === 'id'
          ? { label: f.label, value, code: true }
          : {
              label: f.label,
              value:
                f.type === 'date' || f.type === 'datetime'
                  ? formatAdminDate(value, f.type === 'datetime')
                  : value,
            };
      });
  });

  protected readonly history = computed<RecordHistoryLine[]>(() =>
    (this.record()?.history ?? []).map((line) => ({
      actor: line.actor,
      what: line.what,
      when: formatAdminDate(line.at, true),
    })),
  );

  constructor() {
    effect(() => {
      const table = this.table();
      const record = this.record();
      if (table && record) this.title.setTitle(`${record.name} · ${table.label} · Jubilee admin`);
    });
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => [params.get('table') ?? '', params.get('id') ?? ''] as const),
        distinctUntilChanged((a, b) => a[0] === b[0] && a[1] === b[1]),
        takeUntilDestroyed(),
      )
      .subscribe(([key, id]) => {
        this.key.set(key);
        this.id.set(id);
        this.load();
      });
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.refused.set(null);
    this.screen.outcome.set(null);
    this.reading?.unsubscribe();
    this.reading = this.api.record(this.key(), this.id()).subscribe({
      next: (record) => this.state.set({ status: 'loaded', value: record }),
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        if (status === 403 || status === 404) {
          this.refused.set(status === 403 ? 'forbidden' : 'not-found');
          this.screen.outcome.set(status === 403 ? 'admin-only' : 'admin-not-found');
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-504') });
      },
    });
  }

  protected copied(): void {
    this.toasts.show({ tone: 'success', title: 'ID copied', text: '' });
  }

  protected signOut(): void {
    this.session.signOut().subscribe(() => void this.router.navigate(['/signed-out']));
  }
}
