import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  MemberRequestRow,
  MemberRequestStatus,
  MemberRequestTab,
  MemberRequests,
  REQUESTS_API,
} from 'api';
import { EmptyState, Icon, IconName, Button, RowListSkeleton, Avatar } from 'components';
import { interval } from 'rxjs';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { threadTime } from '../../services/message-time';
import { STATUS_TONE, statusChangeToast } from '../../services/request-status';
import { ToastService } from '../../toasts/toast.service';

/** How often the page looks again, so a status change shows without a reload (L2-070). */
const POLL_MS = 5000;

const TABS: { tab: MemberRequestTab; label: string; count: keyof MemberRequests['counts'] }[] = [
  { tab: 'all', label: 'All', count: 'all' },
  { tab: 'bookings', label: 'Bookings', count: 'bookings' },
  { tab: 'quotes', label: 'Quotes', count: 'quotes' },
  { tab: 'orders', label: 'Orders', count: 'orders' },
  { tab: 'declined', label: 'Declined', count: 'declined' },
];

const ICON: Record<string, IconName> = { booking: 'calendar', quote: 'message', order: 'bag' };

/** Your requests at /requests (L2-047): every booking, quote and order the member sent. */
@Component({
  selector: 'jb-requests-page',
  imports: [RouterLink, EmptyState, Icon, Button, RowListSkeleton, Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './requests.page.html',
})
export class RequestsPage implements OnInit {
  private readonly api = inject(REQUESTS_API);
  private readonly clock = inject(ClockService);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = TABS;
  protected readonly skeleton = [1, 2, 3, 4];
  protected readonly state = signal<LoadState<MemberRequests>>({ status: 'loading' });
  protected readonly tab = signal<MemberRequestTab>('all');
  protected readonly rows = signal<MemberRequestRow[]>([]);
  protected readonly loadingMore = signal(false);
  protected readonly moreFailed = signal(false);

  /** The status each request had when last seen, so a change is announced once. */
  private statuses: Map<string, MemberRequestStatus> | null = null;

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status !== 'loaded') return 'Your bookings, quotes and orders.';
    const { counts, open, awaiting } = state.value;
    return counts.all === 0 ? 'Nothing requested yet' : `${open} open · ${awaiting} awaiting reply`;
  });

  ngOnInit(): void {
    this.load('all');
    interval(POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  protected load(tab: MemberRequestTab): void {
    this.tab.set(tab);
    this.state.set({ status: 'loading' });
    this.rows.set([]);
    this.moreFailed.set(false);
    this.api.list(tab, null).subscribe({
      next: (requests) => this.show(requests),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-REQ-501') }),
    });
  }

  /** Asks again for what is on screen, without the loading state; a failure leaves the page as it is. */
  private refresh(): void {
    if (this.state().status !== 'loaded' || this.loadingMore()) return;
    const tab = this.tab();
    this.api.list(tab, null).subscribe({
      next: (requests) => {
        if (tab !== this.tab()) return;
        this.announce(requests.rows);
        this.show(requests, true);
      },
      error: () => undefined,
    });
  }

  private show(requests: MemberRequests, keepMore = false): void {
    const loaded = this.rows().length;
    // A refresh replaces the first page and keeps any pages the member already asked for.
    const kept =
      keepMore && loaded > requests.rows.length ? this.rows().slice(requests.rows.length) : [];
    this.rows.set([...requests.rows, ...kept]);
    this.seen(requests.rows);
    this.state.set({ status: 'loaded', value: requests });
  }

  protected loadMore(): void {
    const state = this.state();
    if (state.status !== 'loaded' || !state.value.nextCursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.moreFailed.set(false);
    this.api.list(this.tab(), state.value.nextCursor).subscribe({
      next: (next) => {
        this.rows.update((rows) => [...rows, ...next.rows]);
        this.seen(next.rows);
        this.state.set({
          status: 'loaded',
          value: { ...state.value, nextCursor: next.nextCursor },
        });
        this.loadingMore.set(false);
      },
      error: () => {
        this.moreFailed.set(true);
        this.loadingMore.set(false);
      },
    });
  }

  private seen(rows: MemberRequestRow[]): void {
    this.statuses ??= new Map();
    for (const row of rows) this.statuses.set(row.id, row.status);
  }

  private announce(rows: MemberRequestRow[]): void {
    const before = this.statuses;
    if (!before) return;
    for (const row of rows) {
      const was = before.get(row.id);
      if (!was) continue;
      const toast = statusChangeToast(row.business, row.kind, was, row.status);
      if (toast) this.toasts.show(toast);
    }
  }

  protected icon(row: MemberRequestRow): IconName {
    return ICON[row.kind];
  }

  protected tone(row: MemberRequestRow): string {
    return STATUS_TONE[row.status];
  }

  protected sent(row: MemberRequestRow): string {
    return `Sent ${threadTime(row.sentAt, this.clock.now())}`;
  }

  protected emptyTab(tab: MemberRequestTab): { heading: string; text: string } {
    switch (tab) {
      case 'declined':
        return {
          heading: 'No declined requests',
          text: 'Every business you’ve asked has said yes, or is still deciding.',
        };
      case 'bookings':
        return {
          heading: 'No bookings yet',
          text: 'Book a meeting with a business to see it here.',
        };
      case 'quotes':
        return { heading: 'No quotes yet', text: 'Ask a business for a quote to see it here.' };
      default:
        return { heading: 'No orders yet', text: 'Request a product to see your order here.' };
    }
  }
}
