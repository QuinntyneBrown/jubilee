import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  REVIEW_REPORT_NOTE_MAX_LENGTH,
  REVIEWS_API,
  ReviewReportReason,
  isRateLimited,
  newKey,
  tryAgainIn,
} from 'api';
import {
  Alert,
  Button,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Field,
  RadioGroup,
  Textarea,
} from 'components';
import { timeout } from 'rxjs';

export interface ReportReviewData {
  reviewId: string;
  author: string;
}

type View = 'form' | 'busy' | 'failed' | 'success';
type FieldName = 'reason' | 'note';

/** A report that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

const REASONS: { value: ReviewReportReason; label: string }[] = [
  { value: 'not-a-real-dealing', label: 'It isn’t about a real dealing with them' },
  { value: 'abusive', label: 'It’s abusive or hateful' },
  { value: 'private-details', label: 'It shares private details' },
  { value: 'advertising', label: 'It’s advertising or off-topic' },
  { value: 'other', label: 'Something else' },
];

const MESSAGES: Record<string, string> = {
  'reason:REASON_REQUIRED': 'Choose what’s wrong with it.',
  'note:TOO_LONG': 'Use 1,000 characters or fewer.',
};

/**
 * ReportReviewDialog (L2-236): a member tells the Jubilee team what is wrong with a review.
 * A retry reuses the idempotency key (L2-132), a refusal sits under its field (L2-126), and a
 * failure keeps what was typed (L2-128). The author is never told who reported it.
 */
@Component({
  selector: 'jb-report-review-dialog',
  imports: [
    FormsModule,
    Alert,
    Button,
    DialogBody,
    DialogFooter,
    DialogFrame,
    Field,
    RadioGroup,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-review.dialog.html',
})
export class ReportReviewDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(REVIEWS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ReportReviewData>(DIALOG_DATA);

  protected readonly reasons = REASONS;
  protected readonly max = REVIEW_REPORT_NOTE_MAX_LENGTH;
  protected readonly view = signal<View>('form');
  protected readonly reason = signal<ReviewReportReason | null>(null);
  protected readonly note = signal('');
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly counter = computed(
    () =>
      `${this.note().length.toLocaleString('en-CA')} / ${REVIEW_REPORT_NOTE_MAX_LENGTH.toLocaleString('en-CA')}`,
  );
  /** One key for every try of this report, so a retry is never a second report (L2-132). */
  private readonly key = newKey();

  protected chooseReason(reason: ReviewReportReason): void {
    this.reason.set(reason);
    if (this.problems().reason) this.problems.update((p) => ({ ...p, reason: undefined }));
  }

  protected send(): void {
    if (this.busy()) return;
    if (!this.reason()) {
      this.problems.set({ reason: MESSAGES['reason:REASON_REQUIRED'] });
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.problems.set({});
    this.view.set('busy');
    this.api
      .report(this.data.reviewId, { reason: this.reason(), note: this.note().trim() }, this.key)
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: () => this.view.set('success'),
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Partial<Record<FieldName, string>> = {};
      for (const field of ['reason', 'note'] as FieldName[]) {
        if (errors[field])
          found[field] = MESSAGES[`${field}:${errors[field]}`] ?? 'Check this field.';
      }
      if (Object.keys(found).length > 0) {
        this.problems.set(found);
        this.view.set('form');
        this.focusFirstInvalid();
        return;
      }
    }
    this.failure.set(
      isRateLimited(error)
        ? { title: `You’re doing that a lot. ${tryAgainIn(error)}`, text: '' }
        : {
            title: 'We couldn’t send that',
            text: 'Nothing was sent and what you wrote is still here. Try again.',
          },
    );
    this.view.set('failed');
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      this.host.nativeElement
        .querySelector<HTMLElement>('input[aria-invalid="true"], textarea[aria-invalid="true"]')
        ?.focus();
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
