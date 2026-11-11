import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADMIN_API, ReportFilter, ReportList, ReportListItem } from 'api';
import { EmptyState, Icon, Button } from 'components';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { threadTime } from '../../services/message-time';
import { TeamNav } from '../admin-team-nav/team-nav';

const FILTERS: { key: ReportFilter; label: string }[] = [
  { key: 'unresolved', label: 'Unresolved' },
  { key: 'open', label: 'Open' },
  { key: 'in-review', label: 'In review' },
  { key: 'resolved', label: 'Resolved' },
];

const STATUS: Record<string, string> = {
  open: 'Open',
  'in-review': 'In review',
  resolved: 'Resolved',
};

/** The reports at /admin/reports (L2-105): listing and conversation reports, oldest first, overdue marked. */
@Component({
  selector: 'jb-admin-reports-page',
  imports: [RouterLink, EmptyState, Icon, TeamNav, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-reports.page.html',
})
export class AdminReportsPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly clock = inject(ClockService);

  protected readonly filters = FILTERS;
  protected readonly state = signal<LoadState<ReportList>>({ status: 'loading' });
  protected readonly filter = signal<ReportFilter>('unresolved');
  protected readonly skeleton = [1, 2, 3, 4];

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Loading the reports…';
    if (state.status === 'error') return 'Reports about listings and conversations.';
    const { unresolvedCount, overdueCount } = state.value;
    if (unresolvedCount === 0) return 'Nothing waiting';
    return overdueCount > 0
      ? `${unresolvedCount} unresolved · ${overdueCount} overdue`
      : `${unresolvedCount} unresolved`;
  });

  ngOnInit(): void {
    this.load('unresolved');
  }

  protected load(filter: ReportFilter): void {
    this.filter.set(filter);
    this.state.set({ status: 'loading' });
    this.api.reports(filter).subscribe({
      next: (list) => this.state.set({ status: 'loaded', value: list }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-511') }),
    });
  }

  protected received(item: ReportListItem): string {
    return threadTime(item.createdAt, this.clock.now());
  }

  protected statusLabel(item: ReportListItem): string {
    return STATUS[item.status];
  }
}
