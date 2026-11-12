import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADMIN_API, QueueRow, QueueStage, VerificationQueue } from 'api';
import {
  EmptyState,
  Icon,
  Button,
  RowListSkeleton,
  Badge,
  PageHeader,
  TabListItem,
  TabList,
  Table,
  TableCell,
  TableScroll,
  TableHeadCell,
} from 'components';
import { ClockService } from 'api';
import { LoadState, errorReference } from 'api';
import { threadTime } from 'api';

/** The verification queue at /verifications (L2-099): submitted listings, oldest first. */
@Component({
  selector: 'jb-admin-verifications-page',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    Button,
    RowListSkeleton,
    Badge,
    PageHeader,
    TabList,
    Table,
    TableCell,
    TableScroll,
    TableHeadCell,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-verifications.page.html',
})
export class AdminVerificationsPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly clock = inject(ClockService);

  protected readonly state = signal<LoadState<VerificationQueue>>({ status: 'loading' });
  protected readonly stage = signal<QueueStage | null>(null);
  protected readonly stageTabs = computed<TabListItem<QueueStage>[]>(() => {
    const state = this.state();
    if (state.status !== 'loaded') return [];
    return state.value.tabs.map((tab) => ({ key: tab.stage, label: tab.label, count: tab.count }));
  });
  protected readonly skeleton = [1, 2, 3, 4];

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Loading the queue…';
    if (state.status === 'error') return 'Listings waiting for a review.';
    const { total, readyToReview, oldestWaitingDays } = state.value;
    if (total === 0) return 'Nothing waiting';
    const noun = total === 1 ? 'listing' : 'listings';
    const oldest =
      oldestWaitingDays === null
        ? ''
        : ` · oldest waiting ${oldestWaitingDays} ${oldestWaitingDays === 1 ? 'day' : 'days'}`;
    return `${total} ${noun} · ${readyToReview} ready to review${oldest}`;
  });

  ngOnInit(): void {
    this.load(null);
  }

  protected load(stage: QueueStage | null): void {
    this.state.set({ status: 'loading' });
    this.api.queue(stage, '').subscribe({
      next: (queue) => {
        this.stage.set(queue.filter);
        this.state.set({ status: 'loaded', value: queue });
      },
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-503') }),
    });
  }

  protected submitted(row: QueueRow): string {
    return threadTime(row.submittedAt, this.clock.now());
  }
}
