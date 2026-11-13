import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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
  WorkspaceHeader,
} from 'components';
import { EMPTY, filter, interval, switchMap } from 'rxjs';
import {
  ConfirmRequestData,
  ConfirmRequestDialog,
  requestConflict,
  requestNoun,
} from '../../dialogs/confirm-request/confirm-request.dialog';
import {
  DeclineRequestData,
  DeclineRequestDialog,
  DeclineResult,
} from '../../dialogs/decline-request/decline-request.dialog';
import {
  FulfilRequestData,
  FulfilRequestDialog,
} from '../../dialogs/fulfil-request/fulfil-request.dialog';
import { ClockService } from 'api';
import { LoadState, errorReference } from 'api';
import { threadTime } from 'api';
import { NavigationStore } from '../../services/navigation.store';
import { RealtimeService } from '../../services/realtime.service';
import { ToastService } from 'components';

/** How often the page asks for new requests while the event stream cannot connect (L2-051 AC7). */
const POLL_MS = 5000;

/** The page's own address: a notification about a request of the owner's opens it. */
const PATH = '/my-business/requests';

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
  private readonly realtime = inject(RealtimeService);
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

  /** Asks on a timer only while the event stream cannot connect (L2-051 AC7; ADR 0050). */
  private readonly fallback = toObservable(this.realtime.connected).pipe(
    switchMap((connected) => (connected ? EMPTY : interval(POLL_MS))),
  );

  constructor() {
    // The stream's count of the owner's new requests moved: one arrived, or a customer cancelled one.
    let count = this.navigation.summary().newRequestCount;
    effect(() => {
      const next = this.navigation.summary().newRequestCount;
      if (next === count) return;
      count = next;
      untracked(() => {
        // Before the first answer there is nothing to bring up to date.
        if (this.lastNew !== null && next !== this.lastNew) this.refresh();
      });
    });
    // The stream came back: what it could not say while it was down is read once.
    let connected = this.realtime.connected();
    effect(() => {
      const now = this.realtime.connected();
      if (now && !connected) untracked(() => this.refresh());
      connected = now;
    });
  }

  ngOnInit(): void {
    this.load(this.tab());
    // A notification about one of the owner's requests: a new one, or one a customer cancelled (L2-051 AC5).
    this.realtime.received
      .pipe(
        filter((item) => item.kind === 'request' && item.target === PATH),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.refresh());
    this.fallback.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
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

  /** A confirmed order is closed by its owner; a booking completes by itself (L2-225 AC1). */
  protected canFulfil(row: IncomingRequestRow): boolean {
    return row.kind === 'order' && row.statusLabel === 'Confirmed';
  }

  protected openFulfil(row: IncomingRequestRow): void {
    const ref = this.dialog.open<RequestDecision, FulfilRequestData>(FulfilRequestDialog, {
      data: { request: row },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      this.refresh();
      if (!decision) return;
      this.toasts.show({
        tone: 'success',
        title: 'Order fulfilled',
        text: `${decision.customerFirstName} has been told.`,
      });
    });
  }

  protected openConfirm(row: IncomingRequestRow): void {
    const ref = this.dialog.open<RequestDecision, ConfirmRequestData>(ConfirmRequestDialog, {
      data: {
        request: row,
        // The dialog was closed before the answer came: it is reported all the same (L2-052 AC5, AC7).
        settled: (outcome) => {
          if (outcome.confirmed) this.confirmed(row, outcome.decision);
          else this.notConfirmed(row, outcome.conflict);
        },
      },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      if (decision) this.confirmed(row, decision);
      else this.refresh();
    });
  }

  private confirmed(row: IncomingRequestRow, decision: RequestDecision): void {
    this.refresh();
    const first = decision.customerFirstName;
    this.toasts.show({
      tone: 'success',
      title: `${row.kindLabel} confirmed`,
      text: `${first} has been told. Message them about payment and pickup.`,
      durationMs: UNDO_MS,
      action: { label: 'Undo', run: () => this.undo(row, first) },
    });
  }

  /**
   * The danger toast of a confirmation that failed with no dialog left to say so (L2-052 AC5). A
   * request that can no longer be confirmed carries the server's sentence and nothing to try.
   */
  private notConfirmed(row: IncomingRequestRow, conflict: string | null): void {
    this.refresh();
    const first = row.customerName.split(' ')[0];
    this.toasts.show({
      tone: 'danger',
      title: `Couldn’t confirm the ${requestNoun(row.kind)}`,
      text: conflict ?? `${first}’s request is still new. Try again.`,
      action:
        conflict === null ? { label: 'Try again', run: () => this.confirmAgain(row) } : undefined,
    });
  }

  private confirmAgain(row: IncomingRequestRow): void {
    this.api.confirm(row.id).subscribe({
      next: (decision) => this.confirmed(row, decision),
      error: (error: unknown) => this.notConfirmed(row, requestConflict(error)),
    });
  }

  protected openDecline(row: IncomingRequestRow): void {
    const ref = this.dialog.open<DeclineResult, DeclineRequestData>(DeclineRequestDialog, {
      data: { request: row },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      if (!decision) return;
      this.refresh();
      if ('conflict' in decision) {
        this.toasts.show({
          tone: 'danger',
          title: 'Request not declined',
          text: decision.conflict,
        });
        return;
      }
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
