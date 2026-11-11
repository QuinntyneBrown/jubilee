import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
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
import { Router, RouterLink } from '@angular/router';
import {
  INCOMING_REQUESTS_API,
  IncomingRequestRow,
  IncomingRequests,
  IncomingTab,
  RequestDecision,
} from 'api';
import {
  EmptyState,
  Icon,
  Button,
  RowListSkeleton,
  Avatar,
  Badge,
  Row,
  RowActions,
  RowMeta,
  RowTitle,
  Rows,
  TabListItem,
  TabList,
} from 'components';
import { interval } from 'rxjs';
import {
  ConfirmRequestData,
  ConfirmRequestDialog,
} from '../../dialogs/confirm-request/confirm-request.dialog';
import {
  DeclineRequestData,
  DeclineRequestDialog,
} from '../../dialogs/decline-request/decline-request.dialog';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { threadTime } from '../../services/message-time';
import { NavigationStore } from '../../services/navigation.store';
import { ToastService } from '../../toasts/toast.service';
import { WorkspaceHeader } from '../my-business/workspace-header';

/** How often the page asks for new requests (L2-051 AC3: a new request shows within five seconds). */
const POLL_MS = 5000;

/** How long an owner can take back a confirmation (L2-052 AC4). */
const UNDO_MS = 8000;

const TABS: { tab: IncomingTab; label: string }[] = [
  { tab: 'new', label: 'New' },
  { tab: 'confirmed', label: 'Confirmed' },
  { tab: 'declined', label: 'Declined' },
  { tab: 'all', label: 'All' },
];

/** The owner's requests at /my-business/requests (L2-051): confirm or decline what members asked for. */
@Component({
  selector: 'jb-incoming-requests-page',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    WorkspaceHeader,
    Button,
    RowListSkeleton,
    Avatar,
    Badge,
    Row,
    RowActions,
    RowMeta,
    RowTitle,
    Rows,
    TabList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './incoming-requests.page.html',
})
export class IncomingRequestsPage implements OnInit {
  private readonly api = inject(INCOMING_REQUESTS_API);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  private readonly toasts = inject(ToastService);
  private readonly navigation = inject(NavigationStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs = computed<TabListItem<IncomingTab>[]>(() => {
    const state = this.state();
    return TABS.map((item) => ({
      key: item.tab,
      label: item.label,
      count: state.status === 'loaded' ? state.value.counts[item.tab] : null,
    }));
  });
  protected readonly skeleton = [1, 2, 3];
  protected readonly state = signal<LoadState<IncomingRequests>>({ status: 'loading' });
  protected readonly tab = signal<IncomingTab>('new');

  /** The new requests already seen, so only a request that arrives later is announced. */
  private known: Set<string> | null = null;
  private lastNew: number | null = null;

  protected readonly subtitle = computed(() => {
    const state = this.state();
    if (state.status !== 'loaded') return 'Confirm or decline what members have asked for.';
    const count = state.value.counts.new;
    const lead = count === 0 ? 'No new requests' : `${count} new`;
    return state.value.repliesFast
      ? `${lead} · you’re replying within a day, which keeps your “replies fast” badge`
      : `${lead} · reply within a day to keep your “replies fast” badge`;
  });

  ngOnInit(): void {
    this.load(this.tab());
    interval(POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  protected load(tab: IncomingTab): void {
    this.tab.set(tab);
    this.state.set({ status: 'loading' });
    this.fetch(tab, false);
  }

  /** Asks again without the loading state, so a list the owner is reading does not flicker. */
  private refresh(): void {
    if (this.state().status === 'error') return;
    this.fetch(this.tab(), true);
  }

  private fetch(tab: IncomingTab, quiet: boolean): void {
    this.api.list(tab).subscribe({
      next: (requests) => {
        if (tab !== this.tab()) return;
        this.announceNew(requests);
        if (requests.counts.new !== this.lastNew) this.navigation.load();
        this.lastNew = requests.counts.new;
        this.state.set({ status: 'loaded', value: requests });
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.router.navigateByUrl('/forbidden');
          return;
        }
        if (!quiet)
          this.state.set({ status: 'error', reference: errorReference(error, 'JB-REQ-503') });
      },
    });
  }

  /** A request that was not there on the last look is announced once (L2-051 AC3). */
  private announceNew(requests: IncomingRequests): void {
    const fresh = requests.rows.filter((row) => row.statusLabel === 'New');
    const seen = this.known;
    this.known = new Set([...(seen ?? []), ...fresh.map((row) => row.id)]);
    if (!seen) return;
    for (const row of fresh) {
      if (seen.has(row.id)) continue;
      this.toasts.show({
        tone: 'info',
        title: `New ${row.kindLabel.toLowerCase()} request`,
        text: `${row.customerName} asked for ${row.title}.`,
      });
    }
  }

  protected sent(row: IncomingRequestRow): string {
    return threadTime(row.sentAt, this.clock.now());
  }

  protected isNew(row: IncomingRequestRow): boolean {
    return row.statusLabel === 'New';
  }

  protected openConfirm(row: IncomingRequestRow): void {
    const ref = this.dialog.open<RequestDecision, ConfirmRequestData>(ConfirmRequestDialog, {
      data: { request: row },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      this.refresh();
      if (!decision) return;
      const first = decision.customerFirstName;
      this.toasts.show({
        tone: 'success',
        title: `${row.kindLabel} confirmed`,
        text: `${first} has been told. Message them about payment and pickup.`,
        durationMs: UNDO_MS,
        action: { label: 'Undo', run: () => this.undo(row, first) },
      });
    });
  }

  protected openDecline(row: IncomingRequestRow): void {
    const ref = this.dialog.open<RequestDecision, DeclineRequestData>(DeclineRequestDialog, {
      data: { request: row },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      if (!decision) return;
      this.refresh();
      this.toasts.show({
        tone: 'success',
        title: `${row.kindLabel} declined`,
        text: `${decision.customerFirstName} has been told and can reply in Messages.`,
      });
    });
  }

  private undo(row: IncomingRequestRow, first: string): void {
    this.api.undoConfirm(row.id).subscribe({
      next: () => {
        this.refresh();
        this.toasts.show({
          tone: 'info',
          title: 'Confirmation undone',
          text: `${first} was not told. The request is new again.`,
        });
      },
      error: () =>
        this.toasts.show({
          tone: 'danger',
          title: 'Couldn’t undo the confirmation',
          text: `The request is confirmed and ${first} has been told. Message them to change it.`,
        }),
    });
  }

  private dialogOptions() {
    return {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    };
  }
}
