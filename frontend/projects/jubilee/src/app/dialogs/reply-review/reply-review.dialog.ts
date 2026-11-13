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
import { ListingReview, REPLY_MAX_LENGTH, REVIEWS_API, isRateLimited, tryAgainIn } from 'api';
import {
  Alert,
  Button,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Field,
  Stars,
  Textarea,
} from 'components';
import { timeout } from 'rxjs';

export interface ReplyReviewData {
  review: ListingReview;
}

type View = 'form' | 'busy' | 'failed';

/** A reply that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

const MESSAGES: Record<string, string> = {
  TEXT_REQUIRED: 'Write your reply.',
  REQUIRED: 'Write your reply.',
  TOO_LONG: 'Use 1,000 characters or fewer.',
};

/**
 * ReplyReviewDialog (L2-234): the owner posts one public reply to a review, or edits the one they
 * posted. The review stands above the field; a failure keeps what was typed (L2-128).
 */
@Component({
  selector: 'jb-reply-review-dialog',
  imports: [
    FormsModule,
    Alert,
    Button,
    DialogBody,
    DialogFooter,
    DialogFrame,
    Field,
    Stars,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reply-review.dialog.html',
})
export class ReplyReviewDialog {
  private readonly ref = inject<DialogRef<ListingReview>>(DialogRef);
  private readonly api = inject(REVIEWS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ReplyReviewData>(DIALOG_DATA);

  protected readonly max = REPLY_MAX_LENGTH;
  /** A reply is already there: the owner edits it. */
  protected readonly editing = this.data.review.reply !== null;
  protected readonly heading = this.editing
    ? 'Edit your reply'
    : `Reply to ${this.data.review.author}`;

  protected readonly view = signal<View>('form');
  protected readonly text = signal(this.data.review.reply?.text ?? '');
  protected readonly problem = signal('');
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly counter = computed(
    () =>
      `${this.text().length.toLocaleString('en-CA')} / ${REPLY_MAX_LENGTH.toLocaleString('en-CA')}`,
  );

  protected post(): void {
    if (this.busy()) return;
    const text = this.text().trim();
    if (!text) {
      this.problem.set(MESSAGES['TEXT_REQUIRED']);
      this.view.set('form');
      this.focusField();
      return;
    }
    this.problem.set('');
    this.view.set('busy');
    this.api
      .reply(this.data.review.id, text)
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (review) => this.ref.close(review),
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const code = (error.error as { errors?: Record<string, string> } | null)?.errors?.['text'];
      if (code) {
        this.problem.set(MESSAGES[code] ?? 'Check your reply.');
        this.view.set('form');
        this.focusField();
        return;
      }
    }
    this.failure.set(
      isRateLimited(error)
        ? { title: `You’re doing that a lot. ${tryAgainIn(error)}`, text: '' }
        : { title: 'We couldn’t post your reply', text: 'Try again.' },
    );
    this.view.set('failed');
  }

  private focusField(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#rr-text')?.focus());
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
