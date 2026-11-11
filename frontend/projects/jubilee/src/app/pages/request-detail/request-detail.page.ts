import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CancelDecision, MemberRequestDetail, REQUESTS_API } from 'api';
import { EmptyState, Icon } from 'components';
import { interval } from 'rxjs';
import {
  CancelRequestData,
  CancelRequestDialog,
} from '../../dialogs/cancel-request/cancel-request.dialog';
import { ClockService } from '../../services/clock.service';
import { LoadState, errorReference } from '../../services/load-state';
import { threadTime } from '../../services/message-time';
import { STATUS_TONE, statusChangeToast } from '../../services/request-status';
import { ToastService } from '../../toasts/toast.service';

/** How often the page looks again, so a status change shows without a reload (L2-070). */
const POLL_MS = 5000;

/** How long a member can take back a cancel (L2-049 AC3). */
const UNDO_MS = 8000;

const NOUN = { booking: 'booking', quote: 'quote request', order: 'order' } as const;

/** One request at /requests/:id (L2-048): its status, details, progress and next steps. */
@Component({
  selector: 'jb-request-detail-page',
  imports: [RouterLink, EmptyState, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container page' },
  templateUrl: './request-detail.page.html',
})
export class RequestDetailPage implements OnInit {
  private readonly api = inject(REQUESTS_API);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly clock = inject(ClockService);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly state = signal<LoadState<MemberRequestDetail>>({ status: 'loading' });
  protected readonly tone = STATUS_TONE;

  ngOnInit(): void {
    this.load();
    interval(POLL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refresh());
  }

  protected load(): void {
    this.state.set({ status: 'loading' });
    this.api.get(this.id).subscribe({
      next: (detail) => this.state.set({ status: 'loaded', value: detail }),
      error: (error: unknown) => this.fail(error),
    });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      void this.router.navigateByUrl('/not-found', { skipLocationChange: true });
      return;
    }
    this.state.set({ status: 'error', reference: errorReference(error, 'JB-REQ-502') });
  }

  /** Asks again without the loading state and announces a change of status. */
  private refresh(): void {
    const before = this.state();
    if (before.status !== 'loaded') return;
    this.api.get(this.id).subscribe({
      next: (detail) => {
        const toast = statusChangeToast(
          detail.business,
          detail.kind,
          before.value.status,
          detail.status,
        );
        if (toast) this.toasts.show(toast);
        this.state.set({ status: 'loaded', value: detail });
      },
      error: () => undefined,
    });
  }

  protected openCancel(detail: MemberRequestDetail): void {
    const ref = this.dialog.open<CancelDecision, CancelRequestData>(CancelRequestDialog, {
      data: {
        id: detail.id,
        noun: NOUN[detail.kind],
        business: detail.business,
        ownerFirstName: detail.ownerFirstName,
        shortNotice: detail.shortNotice,
      },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
    ref.closed.subscribe((decision) => {
      this.refresh();
      if (!decision) return;
      this.toasts.show({
        tone: 'success',
        title: 'Request cancelled',
        text: `${decision.business} has been told.`,
        durationMs: UNDO_MS,
        action: { label: 'Undo', run: () => this.undo(decision.business) },
      });
    });
  }

  private undo(business: string): void {
    this.api.undoCancel(this.id).subscribe({
      next: () => {
        this.refresh();
        this.toasts.show({
          tone: 'info',
          title: 'Cancellation withdrawn',
          text: `${business} has been told. Your request is open again.`,
        });
      },
      error: () => {
        this.refresh();
        this.toasts.show({
          tone: 'danger',
          title: 'Couldn’t undo the cancellation',
          text: 'The request stays cancelled. You can ask again from the business page.',
        });
      },
    });
  }

  protected calendarUrl(detail: MemberRequestDetail): string {
    return this.api.calendarUrl(detail.id);
  }

  protected asked(at: string | null): string {
    return at ? threadTime(at, this.clock.now()) : '';
  }
}
