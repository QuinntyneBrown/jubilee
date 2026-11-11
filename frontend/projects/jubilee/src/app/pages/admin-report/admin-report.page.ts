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
import { ADMIN_API, ReportActionKind, ReportDetail } from 'api';
import { EmptyState, Icon, Button, Alert, MessageBubble, RowListSkeleton } from 'components';
import {
  ReportActionData,
  ReportActionDialog,
} from '../../dialogs/report-action/report-action.dialog';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { clockTime, dayHeading, dayKey, threadTime } from '../../services/message-time';
import { TeamNav } from '../admin-team-nav/team-nav';

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
};

/**
 * One report at /admin/reports/:id (L2-105): opening it moves it to review, and a reported conversation is
 * shown with it while the report is unresolved (L2-063 AC3). The five actions open a dialog for the note.
 */
@Component({
  selector: 'jb-admin-report-page',
  imports: [RouterLink, EmptyState, Icon, TeamNav, Button, Alert, MessageBubble, RowListSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-report.page.html',
})
export class AdminReportPage implements OnInit {
  private readonly api = inject(ADMIN_API);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(Dialog);
  private readonly clock = inject(ClockService);

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
    return report.type === 'conversation'
      ? `Conversation report about ${report.listing.name}`
      : `Report about ${report.listing.name}`;
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
      data: { reportId: report.id, kind, listingName: report.listing.name },
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
        value: { ...result, conversation: result.conversation ?? report.conversation },
      });
    });
  }
}
