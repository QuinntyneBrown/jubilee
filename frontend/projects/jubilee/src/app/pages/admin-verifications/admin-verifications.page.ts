import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADMIN_API, QueueRow, QueueStage, ReferenceState, VerificationQueue } from 'api';
import { EmptyState, Icon, Button } from 'components';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { threadTime } from '../../services/message-time';
import { TeamNav } from '../admin-team-nav/team-nav';

/** How the church reference is named and coloured in the queue; the word always says it too. */
const REFERENCE: Record<ReferenceState, { label: string; tone: string }> = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  waiting: { label: 'Waiting', tone: 'warning' },
  'cant-vouch': { label: 'Can’t vouch', tone: 'danger' },
  'doesnt-know': { label: 'Doesn’t know', tone: 'danger' },
  expired: { label: 'Expired', tone: 'warning' },
  deleted: { label: 'Deleted', tone: 'info' },
};

/** The verification queue at /admin/verifications (L2-099): submitted listings, oldest first. */
@Component({
  selector: 'jb-admin-verifications-page',
  imports: [RouterLink, EmptyState, Icon, TeamNav, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-verifications.page.html',
})
export class AdminVerificationsPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly clock = inject(ClockService);

  protected readonly state = signal<LoadState<VerificationQueue>>({ status: 'loading' });
  protected readonly stage = signal<QueueStage | null>(null);
  protected readonly skeleton = [1, 2, 3, 4];

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status === 'loading') return 'Loading the queue…';
    if (state.status === 'error') return 'Listings waiting for a church reference or a review.';
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

  protected reference(row: QueueRow): { label: string; tone: string } {
    return REFERENCE[row.reference];
  }

  protected submitted(row: QueueRow): string {
    return threadTime(row.submittedAt, this.clock.now());
  }
}
