import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ADMIN_TABLES_API, AdminRecord, AdminValues, errorReference, LoadState } from 'api';
import {
  AdminPage,
  Button,
  EmptyState,
  Icon,
  RecordChoice,
  RecordCrumbs,
  RecordEdit,
  RecordFields,
  RecordGrid,
  RecordHead,
  RecordsColumn,
  RecordSystem,
  RecordSystemValue,
  Spinner,
  ToastService,
} from 'components';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  of,
  Subscription,
  take,
} from 'rxjs';
import { AdminCatalogService } from '../../services/admin-catalog.service';
import { AdminScreenService } from '../../services/admin-screen.service';
import { StaffSessionService } from '../../services/staff-session.service';
import { AdminOnlyPage } from '../admin-only/admin-only.page';
import { NotFoundPage } from '../not-found/not-found.page';
import { ownFields, refusalOf, systemValues, wireOf } from '../record/record-values';

/** How many records a reference's select offers (L2-283 AC1). */
const CHOICES = 250;

/**
 * A record being changed, `/{table}/{id}/edit`, or made, `/{table}/new` (L2-283): the fields the
 * role may change become editors of their type; "Save changes" or "Create {singular}" sends them
 * to the server, which checks them as the feature that owns the table does, and "Cancel" drops
 * them. A refusal is said under each field; a saved change returns to the record with "Saved".
 */
@Component({
  selector: 'jb-record-edit-page',
  imports: [
    RouterLink,
    AdminPage,
    Button,
    EmptyState,
    Icon,
    RecordCrumbs,
    RecordFields,
    RecordGrid,
    RecordHead,
    RecordSystem,
    Spinner,
    AdminOnlyPage,
    NotFoundPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page' },
  templateUrl: './record-edit.page.html',
})
export class RecordEditPage {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly catalog = inject(AdminCatalogService);
  private readonly screen = inject(AdminScreenService);
  private readonly title = inject(Title);
  private readonly router = inject(Router);
  private readonly session = inject(StaffSessionService);
  private readonly toasts = inject(ToastService);
  private reading?: Subscription;

  protected readonly creating = inject(ActivatedRoute).snapshot.data['mode'] === 'new';
  protected readonly key = signal('');
  protected readonly id = signal('');
  protected readonly state = signal<LoadState<AdminRecord | null>>({ status: 'loading' });
  protected readonly refused = signal<'forbidden' | 'not-found' | null>(null);
  protected readonly draft = signal<AdminValues>({});
  private readonly changed = signal<ReadonlySet<string>>(new Set());
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly saving = signal(false);
  private readonly refs = signal<Record<string, RecordChoice[]>>({});

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

  /** The fields that become editors: those the role may change, or those a new record is given. */
  protected readonly editable = computed(() =>
    (this.table()?.fields ?? [])
      .filter((f) => (this.creating ? f.creatable : f.editable))
      .map((f) => f.key),
  );

  /** A new record shows the fields it is given; a change shows every field (L2-283 AC1, AC4). */
  protected readonly fields = computed<RecordsColumn[]>(() => {
    const fields = ownFields(this.table());
    if (!this.creating) return fields;
    const given = new Set(this.editable());
    return fields.filter((f) => given.has(f.key));
  });

  /** The choices of each select: "—" and a status's words, or "None" and the records it may name. */
  protected readonly choices = computed(() => {
    const choices: Record<string, RecordChoice[]> = {};
    for (const field of this.table()?.fields ?? []) {
      if (field.type === 'status') {
        choices[field.key] = [
          { value: '', label: '—' },
          ...(field.options ?? []).map((word) => ({ value: word, label: word })),
        ];
      } else if (field.type === 'ref') {
        choices[field.key] = [{ value: '', label: 'None' }, ...(this.refs()[field.key] ?? [])];
      }
    }
    return choices;
  });

  protected readonly system = computed<RecordSystemValue[]>(() =>
    this.creating
      ? (this.table()?.fields ?? [])
          .filter((f) => f.system)
          .map((f) => ({ label: f.label, value: 'set on create' }))
      : systemValues(this.table(), this.record()),
  );

  protected readonly heading = computed(() =>
    this.creating ? `New ${this.singular()}` : (this.record()?.name ?? ''),
  );

  constructor() {
    effect(() => {
      const table = this.table();
      if (table && (this.creating || this.record()))
        this.title.setTitle(`${this.heading()} · ${table.label} · Jubilee admin`);
    });
    const route = inject(ActivatedRoute);
    // The catalog says which fields are editors; the record or the new draft follows it.
    const catalog$ = toObservable(this.catalog.catalog).pipe(filter(Boolean), take(1));
    combineLatest([route.paramMap, catalog$])
      .pipe(
        map(([params]) => [params.get('table') ?? '', params.get('id') ?? ''] as const),
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
    this.errors.set({});
    this.changed.set(new Set());
    this.reading?.unsubscribe();
    const table = this.table();
    if (!table) {
      this.refuse(404);
      return;
    }
    if (this.creating ? !table.canCreate : !table.canEdit) {
      this.refuse(403);
      return;
    }
    const record$ = this.creating ? of(null) : this.api.record(table.key, this.id());
    this.reading = forkJoin([record$, this.choicesOf(table.key)]).subscribe({
      next: ([record, refs]) => {
        this.refs.set(refs);
        this.draft.set(this.draftOf(record));
        this.state.set({ status: 'loaded', value: record });
      },
      error: (error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        if (status === 403 || status === 404) {
          this.refuse(status);
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-504') });
      },
    });
  }

  protected edit(change: RecordEdit): void {
    this.draft.update((draft) => ({ ...draft, [change.key]: change.value }));
    this.changed.update((keys) => new Set([...keys, change.key]));
  }

  protected save(): void {
    const table = this.table();
    if (!table || this.saving()) return;
    const draft = this.draft();
    const keys = this.creating ? this.editable() : [...this.changed()];
    const values = Object.fromEntries(keys.map((key) => [key, draft[key] ?? null]));
    if (!this.creating && keys.length === 0) {
      void this.router.navigate(['/', table.key, this.id()]);
      return;
    }
    this.saving.set(true);
    this.errors.set({});
    const saved$ = this.creating
      ? this.api.create(table.key, values)
      : this.api.update(table.key, this.id(), values);
    saved$.subscribe({
      next: (record) => {
        this.saving.set(false);
        void this.router.navigate(['/', table.key, record.id], { state: { saved: true } });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const problem = error instanceof HttpErrorResponse ? error.error : null;
        const codes = (problem as { errors?: Record<string, string> } | null)?.errors;
        if (error instanceof HttpErrorResponse && error.status === 422 && codes) {
          const labels = new Map(table.fields.map((f) => [f.key, f.label]));
          this.errors.set(
            Object.fromEntries(
              Object.entries(codes).map(([key, code]) => [
                key,
                refusalOf(code, labels.get(key) ?? key),
              ]),
            ),
          );
          return;
        }
        this.toasts.show({
          tone: 'danger',
          title: `We couldn’t save this ${this.singular()}`,
          text: `Nothing was saved. Try again. If it keeps happening, tell us and quote ${errorReference(error, 'JB-ADM-504')}.`,
        });
      },
    });
  }

  protected signOut(): void {
    this.session.signOut().subscribe(() => void this.router.navigate(['/signed-out']));
  }

  private refuse(status: 403 | 404): void {
    this.refused.set(status === 403 ? 'forbidden' : 'not-found');
    this.screen.outcome.set(status === 403 ? 'admin-only' : 'admin-not-found');
  }

  /** The records each reference editor may name: "{name} · {ID}" (L2-283 AC1). */
  private choicesOf(key: string) {
    const table = this.catalog.table(key);
    const editable = new Set(this.editable());
    const refs = (table?.fields ?? []).filter(
      (f) => f.type === 'ref' && f.refTable && editable.has(f.key),
    );
    if (refs.length === 0) return of({} as Record<string, RecordChoice[]>);
    return forkJoin(
      refs.map((f) =>
        this.api
          .rows(f.refTable ?? '', { size: CHOICES })
          .pipe(
            map((page) => [
              f.key,
              page.rows.map((row) => ({ value: row.id, label: `${row.name} · ${row.id}` })),
            ]),
          ),
      ),
    ).pipe(map((pairs) => Object.fromEntries(pairs) as Record<string, RecordChoice[]>));
  }

  /** The editors' first values: the record's, or a new record's first status (L2-283 AC4). */
  private draftOf(record: AdminRecord | null): AdminValues {
    const draft: AdminValues = {};
    for (const field of this.table()?.fields ?? []) {
      draft[field.key] = record
        ? wireOf(record.values[field.key])
        : field.type === 'status'
          ? (field.options?.[0] ?? null)
          : null;
    }
    return draft;
  }
}
