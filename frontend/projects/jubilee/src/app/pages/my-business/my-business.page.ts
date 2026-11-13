import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AwayPeriod,
  INCOMING_REQUESTS_API,
  IncomingRequestRow,
  MY_BUSINESS_API,
  MyBusiness,
  NeedsReply,
  RequestDecision,
  RequestKind,
} from 'api';
import {
  BusinessCard,
  EmptyState,
  Icon,
  Button,
  Alert,
  RowListSkeleton,
  Select,
  Skeleton,
  Avatar,
  initialsOf,
  Card,
  Row,
  RowActions,
  RowMeta,
  RowTitle,
  Rows,
  PageHeader,
  Section,
  WorkspaceHeader,
  Stat,
  StatGrid,
} from 'components';
import {
  ConfirmRequestData,
  ConfirmRequestDialog,
} from '../../dialogs/confirm-request/confirm-request.dialog';
import {
  DeclineRequestData,
  DeclineRequestDialog,
} from '../../dialogs/decline-request/decline-request.dialog';
import { AwayPeriodData, AwayPeriodDialog } from '../../dialogs/away-period/away-period.dialog';
import {
  PauseListingData,
  PauseListingDialog,
} from '../../dialogs/pause-listing/pause-listing.dialog';
import { ClockService } from 'api';
import { LoadState, errorReference } from 'api';
import { StatementDue, dayLabel, longDay, threadTime } from 'api';
import { NavigationStore } from '../../services/navigation.store';
import { SessionService } from '../../services/session.service';
import { openStatementAgreement } from '../../dialogs/statement-agreement/statement-agreement.dialog';
import { ToastService } from 'components';

/** How long an owner can take back a confirmation (L2-052 AC4). */
const UNDO_MS = 8000;

/** My business at /my-business (L2-085, L2-086): the week in numbers, what needs a reply, how the listing stands. */
@Component({
  selector: 'jb-my-business-page',
  imports: [
    BusinessCard,
    RouterLink,
    EmptyState,
    Icon,
    WorkspaceHeader,
    Button,
    Alert,
    RowListSkeleton,
    Select,
    Skeleton,
    Avatar,
    Card,
    Row,
    RowActions,
    RowMeta,
    RowTitle,
    Rows,
    PageHeader,
    Section,
    Stat,
    StatGrid,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './my-business.page.html',
})
export class MyBusinessPage implements OnInit {
  private readonly api = inject(MY_BUSINESS_API);
  private readonly incoming = inject(INCOMING_REQUESTS_API);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  private readonly toasts = inject(ToastService);
  private readonly session = inject(SessionService);
  /** The agreement owed to the updated statement of faith, while it is owed (L2-075 AC5, AC6). */
  protected readonly statementDue = computed(() => this.session.member()?.statementDue ?? null);
  protected readonly agreeBy = computed(() => {
    const due = this.statementDue();
    return due ? longDay(due.agreeBy) : '';
  });
  private owedStatement = false;
  private readonly navigation = inject(NavigationStore);

  protected readonly skeleton = [1, 2, 3];
  protected readonly state = signal<LoadState<MyBusiness>>({ status: 'loading' });
  protected readonly resuming = signal(false);
  protected readonly resumeFailed = signal(false);

  protected readonly business = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  constructor() {
    // Agreeing, here or in the dialog the app opened, makes a listing the job paused live again (L2-075 AC6).
    effect(() => {
      const owed = this.statementDue() !== null;
      if (this.owedStatement && !owed) untracked(() => this.fetch());
      this.owedStatement = owed;
    });
  }

  ngOnInit(): void {
    this.load();
  }

  /** "Read and agree" (L2-075 AC5): the dialog of the updated statement of faith. */
  protected readAndAgree(due: StatementDue, opener: HTMLElement): void {
    openStatementAgreement(this.dialog, due, opener);
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.fetch();
  }

  private fetch(): void {
    this.api.overview().subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          void this.router.navigateByUrl('/forbidden');
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-BIZ-503') });
      },
    });
  }

  /**
   * The switcher (L2-079 AC5): a listing becomes the one the whole workspace shows; a draft opens
   * the listing form. The select is never disabled or redrawn, so it keeps focus and the keyboard can go on choosing.
   */
  protected choose(business: MyBusiness, select: HTMLSelectElement): void {
    const option = business.businesses.find((item) => item.id === select.value);
    const shown = business.businesses.find((item) => item.current);
    if (!option || option.current) return;
    if (option.kind === 'draft') {
      void this.router.navigate(['/list'], { queryParams: { draft: option.id } });
      return;
    }
    this.api.choose(option.id).subscribe({
      next: () => {
        this.fetch();
        this.navigation.load();
      },
      error: () => {
        if (shown) select.value = shown.id;
        this.toasts.show({
          tone: 'danger',
          title: 'We couldn’t switch businesses',
          text: `${business.name} is still shown. Try again.`,
        });
      },
    });
  }

  protected sent(row: NeedsReply): string {
    return threadTime(row.sentAt, this.clock.now());
  }

  /** "↑ 18% on last week" (L2-085 AC2). */
  protected viewsDelta(business: MyBusiness): string {
    const stats = business.stats!;
    const before = stats.views.value - stats.views.change;
    if (before <= 0) return stats.views.value === 0 ? 'No views yet' : 'First views this week';
    if (stats.views.change === 0) return 'Same as last week';
    const percent = Math.round((Math.abs(stats.views.change) / before) * 100);
    return `${stats.views.change > 0 ? '↑' : '↓'} ${percent}% on last week`;
  }

  protected awayDay(until: string): string {
    return dayLabel(until);
  }

  /** "Set away period" (L2-062): a CDK dialog; My business reads again when it saved. */
  protected openAway(business: MyBusiness): void {
    const ref = this.dialog.open<AwayPeriod, AwayPeriodData>(AwayPeriodDialog, {
      data: { awayUntil: business.awayUntil ?? null },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((result) => {
      if (!result) return;
      this.toasts.show(
        result.awayUntil
          ? {
              tone: 'success',
              title: 'Away period set',
              text: `Members who message you see you’re away until ${dayLabel(result.awayUntil)}.`,
            }
          : { tone: 'success', title: 'Away period cleared' },
      );
      this.fetch();
    });
  }

  protected openPause(business: MyBusiness): void {
    const ref = this.dialog.open<unknown, PauseListingData>(PauseListingDialog, {
      data: { business: business.name!, openRequests: business.newRequests },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((result) => {
      if (!result) return;
      this.toasts.show({
        tone: 'success',
        title: 'Listing paused',
        text: 'It’s hidden from browse and search until you resume it.',
      });
      this.fetch();
    });
  }

  protected resume(): void {
    if (this.resuming()) return;
    this.resuming.set(true);
    this.resumeFailed.set(false);
    this.api.resume().subscribe({
      next: () => {
        this.resuming.set(false);
        this.toasts.show({
          tone: 'success',
          title: 'Listing resumed',
          text: 'Members can find you again within a minute.',
        });
        this.fetch();
      },
      error: () => {
        this.resuming.set(false);
        this.resumeFailed.set(true);
      },
    });
  }

  protected openConfirm(row: NeedsReply): void {
    const ref = this.dialog.open<RequestDecision, ConfirmRequestData>(ConfirmRequestDialog, {
      data: { request: this.asRow(row) },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      this.fetch();
      this.navigation.load();
      if (!decision) return;
      const first = decision.customerFirstName;
      this.toasts.show({
        tone: 'success',
        title: `${row.kindLabel} confirmed`,
        text: `${first} has been told. Message them about payment and pickup.`,
        durationMs: UNDO_MS,
        action: {
          label: 'Undo',
          run: () =>
            this.incoming.undoConfirm(row.id).subscribe({
              next: () => {
                this.fetch();
                this.navigation.load();
              },
            }),
        },
      });
    });
  }

  protected openDecline(row: NeedsReply): void {
    const ref = this.dialog.open<RequestDecision, DeclineRequestData>(DeclineRequestDialog, {
      data: { request: this.asRow(row) },
      ...this.dialogOptions(),
    });
    ref.closed.subscribe((decision) => {
      if (!decision) return;
      this.fetch();
      this.navigation.load();
      this.toasts.show({
        tone: 'success',
        title: `${row.kindLabel} declined`,
        text: `${decision.customerFirstName} has been told and can reply in Messages.`,
      });
    });
  }

  private asRow(row: NeedsReply): IncomingRequestRow {
    return {
      id: row.id,
      kind: row.kind as RequestKind,
      kindLabel: row.kindLabel,
      customerName: row.customerName,
      customerInitials: initialsOf(row.customerName),
      title: row.title,
      detail: '',
      sentAt: row.sentAt,
      status: 'new',
      statusLabel: 'New',
      total: null,
      when: null,
    };
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
