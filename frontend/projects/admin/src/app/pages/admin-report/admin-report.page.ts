import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ADMIN_API, ReportActionKind, ReportDetail, ReviewUnderReport, fullDate } from 'api';
import {
  EmptyState,
  Icon,
  Button,
  Alert,
  MessageBubble,
  RowListSkeleton,
  Badge,
  Card,
  Row,
  RowMeta,
  RowTitle,
  Rows,
  PageHeader,
  MessageThread,
  MessageDay,
  DescriptionList,
  DescriptionItem,
  Review,
  ReviewView,
} from 'components';
import {
  ReportActionData,
  ReportActionDialog,
} from '../../dialogs/report-action/report-action.dialog';
import { ClockService } from 'api';
import { LoadState, errorReference } from 'api';
import { clockTime, dayHeading, dayKey, threadTime } from 'api';
import { StaffSessionService } from '../../services/staff-session.service';

const REASON_STATE: Record<string, string> = {
  live: 'Live',
  paused: 'Paused',
  'on-hold': 'On hold',
  removed: 'Removed',
  'not-live': 'Not live',
};

const ACTION_TITLE: Record<ReportActionKind, string> = {
  dismiss: 'Report dismissed',
  'message-reporter': 'Message to the reporter',
  'message-owner': 'Message to the owner',
  hold: 'Listing placed on hold',
  remove: 'Listing removed',
  'lift-hold': 'Hold lifted',
  'take-down': 'Review taken down',
};

/**
 * One report at /reports/:id (L2-105): opening it moves it to review, and a reported conversation is
 * shown with it while the report is unresolved (L2-063 AC3). A reported review is shown as it stands
 * with every report of it, and its actions are Dismiss, Message the reporter and Take the review down
 * (L2-237). Each action opens a dialog for the note.
 */
@Component({
  selector: 'jb-admin-report-page',
  imports: [
    RouterLink,
    EmptyState,
    Icon,
    Button,
    Alert,
    MessageBubble,
    RowListSkeleton,
    Badge,
    Card,
    Row,
    RowMeta,
    RowTitle,
    Rows,
    PageHeader,
    MessageThread,
    MessageDay,
    DescriptionList,
    DescriptionItem,
    Review,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './admin-report.page.html',
})
export class AdminReportPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);
  private readonly clock = inject(ClockService);
  private readonly session = inject(StaffSessionService);

  protected readonly state = signal<LoadState<ReportDetail>>({ status: 'loading' });
  protected readonly skeleton = [1, 2, 3];
  protected readonly notFound = signal(false);

  protected readonly report = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.state.set({ status: 'loading' });
    this.api.openReport(id).subscribe({
      next: (detail) => this.state.set({ status: 'loaded', value: detail }),
      error: (error: unknown) => {
        this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-ADM-512') });
      },
    });
  }

  protected title(report: ReportDetail): string {
    switch (report.type) {
      case 'conversation':
        return `Conversation report about ${report.listing.name}`;
      case 'review':
        return `Report about a review of ${report.listing.name}`;
      default:
        return `Report about ${report.listing.name}`;
    }
  }

  /** The review as the review component shows it, with its dates written out. */
  protected reviewView(review: ReviewUnderReport): ReviewView {
    return {
      author: review.author,
      initials: review.initials,
      rating: review.rating,
      itemName: review.itemName,
      date: fullDate(review.createdAt),
      edited: review.editedAt !== null,
      text: review.text,
      reply: review.reply
        ? {
            from: review.reply.from,
            date: fullDate(review.reply.at),
            edited: review.reply.editedAt !== null,
            text: review.reply.text,
          }
        : null,
    };
  }

  protected listingState(report: ReportDetail): string {
    return REASON_STATE[report.listing.state];
  }

  protected received(report: ReportDetail): string {
    return threadTime(report.createdAt, this.clock.now());
  }

  protected when(iso: string): string {
    return threadTime(iso, this.clock.now());
  }

  protected actionTitle(kind: ReportActionKind): string {
    return ACTION_TITLE[kind];
  }

  protected dayOf(iso: string): string {
    return dayHeading(iso, this.clock.now());
  }

  protected newDay(report: ReportDetail, index: number): boolean {
    const messages = report.conversation?.messages ?? [];
    return index === 0 || dayKey(messages[index - 1].at) !== dayKey(messages[index].at);
  }

  protected timeOf(iso: string): string {
    return clockTime(iso);
  }

  protected act(kind: ReportActionKind, button: HTMLElement): void {
    const report = this.report();
    if (!report) return;
    const ref = this.dialog.open<ReportDetail, ReportActionData>(ReportActionDialog, {
      data: {
        reportId: report.id,
        kind,
        listingName: report.listing.name,
        author: report.review?.author ?? null,
      },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: button,
    });
    ref.closed.subscribe((result) => {
      if (!result) return;
      // The answer to an action carries no messages: the ones opened with the report stay in view.
      this.state.set({
        status: 'loaded',
        value: {
          ...result,
          conversation: result.conversation ?? report.conversation,
          review: result.review ?? report.review,
        },
      });
      // The action may have resolved the report: the admin bar's count is read again (ADR 0058).
      this.session.refresh();
    });
  }
}
