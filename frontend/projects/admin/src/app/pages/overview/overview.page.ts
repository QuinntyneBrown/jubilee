import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { ADMIN_TABLES_API, AdminOverview, ClockService, errorReference, LoadState } from 'api';
import {
  AdminAside,
  AdminAsideSection,
  AdminHeading,
  AdminPage,
  Button,
  ChangeList,
  EmptyState,
  Icon,
  Skeleton,
  SystemList,
  WorkGrid,
  WorkQueue,
} from 'components';
import { Subscription } from 'rxjs';
import { StaffSessionService } from '../../services/staff-session.service';
import {
  changeOf,
  dayOf,
  greetingOf,
  headingOf,
  lineOf,
  sinceOf,
  systemOf,
} from './overview-values';

/**
 * The overview, `/` (L2-274, L2-275): the day and the greeting with what is waiting on staff and
 * what happened since yesterday; the work queue, "Safety" and "Waiting on us", each line opening
 * the oldest record waiting or its table; and beside it System and Recent changes. It is read with
 * the staff session when the screen opens; nothing polls and nothing is pushed (ADR 0058).
 */
@Component({
  selector: 'jb-overview-page',
  imports: [
    AdminAside,
    AdminAsideSection,
    AdminHeading,
    AdminPage,
    Button,
    ChangeList,
    EmptyState,
    Icon,
    Skeleton,
    SystemList,
    WorkGrid,
    WorkQueue,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.page.html',
})
export class OverviewPage {
  private readonly api = inject(ADMIN_TABLES_API);
  private readonly clock = inject(ClockService);
  private readonly session = inject(StaffSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private loading?: Subscription;

  protected readonly state = signal<LoadState<AdminOverview>>({ status: 'loading' });
  protected readonly loadingSections = ['Safety', 'Waiting on us'] as const;
  protected readonly day = dayOf(this.clock.now());
  private readonly greeting = greetingOf(this.clock.torontoHour());
  private readonly first = computed(
    () => this.session.staff()?.displayName.split(' ')[0] ?? 'there',
  );

  protected readonly overview = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });
  protected readonly errorReference = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.reference : null;
  });
  protected readonly heading = computed(() =>
    headingOf(this.greeting, this.first(), this.overview()?.waiting ?? null),
  );
  protected readonly since = computed(() => {
    const overview = this.overview();
    return overview ? sinceOf(overview.since) : [];
  });
  protected readonly sections = computed(() => {
    const now = this.clock.now();
    return (this.overview()?.sections ?? [])
      .filter((s) => s.lines.length > 0)
      .map((s) => ({ ...s, lines: s.lines.map((l) => lineOf(l, now)) }));
  });
  protected readonly system = computed(() => (this.overview()?.system ?? []).map(systemOf));
  protected readonly changes = computed(() => (this.overview()?.changes ?? []).map(changeOf));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.loading = this.api
      .overview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (value) => this.state.set({ status: 'loaded', value }),
        error: (error: unknown) =>
          this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-503') }),
      });
  }
}
