import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ListingReview,
  REVIEW_MAX_LENGTH,
  REVIEW_MIN_LENGTH,
  REVIEWS_API,
  ReviewItemOption,
  STAR_WORDS,
  isRateLimited,
  tryAgainIn,
} from 'api';
import {
  Alert,
  Button,
  ChipOption,
  ChipRow,
  DialogBody,
  DialogFooter,
  DialogFrame,
  Field,
  StarScale,
  Textarea,
} from 'components';
import { timeout } from 'rxjs';

export interface EditReviewData {
  review: ListingReview;
  listingName: string;
  items: ReviewItemOption[];
  itemLegend: 'service' | 'product' | null;
  /** The listing is a space: the prompt asks about the stay. */
  space: boolean;
}

type View = 'form' | 'busy' | 'failed';
type FieldName = 'rating' | 'itemId' | 'text';

/** A save that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

const PROMPT_SPACE = 'Was it as described? How was the host? Would you stay again?';
const PROMPT =
  'What did they do, and how did it go? Was the price what they quoted? Would you hire them again?';

/**
 * EditReviewDialog (L2-232): the author changes the stars, the item and the text of their review.
 * The rules are those of writing one (L2-227); a refusal sits under its field and focus goes to
 * the first, a failure keeps what was typed and says the review has not changed (L2-128).
 */
@Component({
  selector: 'jb-edit-review-dialog',
  imports: [
    FormsModule,
    Alert,
    Button,
    ChipOption,
    ChipRow,
    DialogBody,
    DialogFooter,
    DialogFrame,
    Field,
    StarScale,
    Textarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-review.dialog.html',
})
export class EditReviewDialog {
  private readonly ref = inject<DialogRef<ListingReview>>(DialogRef);
  private readonly api = inject(REVIEWS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<EditReviewData>(DIALOG_DATA);
  private readonly stars = viewChild(StarScale);

  protected readonly words = STAR_WORDS;
  protected readonly max = REVIEW_MAX_LENGTH;
  protected readonly prompt = this.data.space ? PROMPT_SPACE : PROMPT;
  protected readonly itemLegend =
    this.data.itemLegend === 'product' ? 'Which product?' : 'Which service?';
  /** The choice of item shows only when there is one to make. */
  protected readonly choosesItem = this.data.items.length > 1;

  protected readonly view = signal<View>('form');
  protected readonly rating = signal<number | null>(this.data.review.rating);
  protected readonly itemId = signal<string | null>(this.data.review.itemId);
  protected readonly text = signal(this.data.review.text);
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly failure = signal({ title: '', text: '' });
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly length = computed(() => this.text().trim().length);
  protected readonly counter = computed(() =>
    this.length() < REVIEW_MIN_LENGTH
      ? `At least ${REVIEW_MIN_LENGTH} characters · ${this.length()}`
      : `Looks good · ${this.length()}`,
  );

  protected chooseRating(value: number): void {
    this.rating.set(value);
    this.clear('rating');
  }

  protected chooseItem(id: string): void {
    this.itemId.set(id);
    this.clear('itemId');
  }

  protected save(): void {
    if (this.busy()) return;
    const found: Partial<Record<FieldName, string>> = {};
    if (!this.rating()) found.rating = this.message('rating', 'RATING_REQUIRED');
    if (this.length() < REVIEW_MIN_LENGTH) found.text = this.message('text', 'TOO_SHORT');
    else if (this.length() > REVIEW_MAX_LENGTH) found.text = this.message('text', 'TOO_LONG');
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.view.set('busy');
    this.api
      .edit(this.data.review.id, {
        rating: this.rating(),
        itemId: this.itemId(),
        text: this.text().trim(),
      })
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (review) => this.ref.close(review),
        error: (error: unknown) => this.fail(error),
      });
  }

  private message(field: FieldName, code: string): string {
    switch (`${field}:${code}`) {
      case 'rating:RATING_REQUIRED':
        return 'Choose a star rating to post your review.';
      case 'itemId:ITEM_UNKNOWN':
        return this.data.itemLegend === 'product'
          ? 'Choose one of their products.'
          : 'Choose one of their services.';
      case 'text:TOO_SHORT':
        return `Write at least ${REVIEW_MIN_LENGTH} characters. This has ${this.length()}.`;
      case 'text:TOO_LONG':
        return 'Use 2,000 characters or fewer.';
      default:
        return 'Check this field.';
    }
  }

  private fail(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Partial<Record<FieldName, string>> = {};
      for (const field of ['rating', 'itemId', 'text'] as FieldName[]) {
        if (errors[field]) found[field] = this.message(field, errors[field]);
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
        : { title: 'We couldn’t save that', text: 'Your review has not changed. Try again.' },
    );
    this.view.set('failed');
  }

  private clear(field: FieldName): void {
    if (!this.problems()[field]) return;
    this.problems.update((problems) => ({ ...problems, [field]: undefined }));
  }

  private focusFirstInvalid(): void {
    setTimeout(() => {
      const found = this.problems();
      const root = this.host.nativeElement;
      if (found.rating) this.stars()?.focus();
      else if (found.itemId)
        (
          root.querySelector<HTMLElement>('#er-item input:checked') ??
          root.querySelector<HTMLElement>('#er-item input')
        )?.focus();
      else root.querySelector<HTMLElement>('textarea[aria-invalid="true"]')?.focus();
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
