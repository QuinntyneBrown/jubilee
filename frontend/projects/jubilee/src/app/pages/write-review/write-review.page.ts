import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LISTINGS_API,
  ListingReview,
  LoadState,
  REVIEW_MAX_LENGTH,
  REVIEW_MIN_LENGTH,
  REVIEWS_API,
  ReviewForm,
  STAR_WORDS,
  errorReference,
  isRateLimited,
  newKey,
  tryAgainIn,
} from 'api';
import {
  Alert,
  BackLink,
  Button,
  ChipOption,
  ChipRow,
  EmptyState,
  Field,
  ReviewPosted,
  ReviewSubject,
  Skeleton,
  StarScale,
  Textarea,
} from 'components';
import { Subscription, timeout } from 'rxjs';
import { RequiresConnection } from '../../directives/requires-connection';

type FieldName = 'rating' | 'itemId' | 'text';

/** A post that takes longer than this fails instead of spinning (L2-228 AC6). */
const SUBMIT_TIMEOUT_MS = 10_000;

const PROMPT =
  'What did they do, and how did it go? Was the price what they quoted? Would you hire them again?';
const PROMPT_SPACE = 'Was it as described? How was the host? Would you stay again?';

/** Why the screen cannot show the form: the member may not write (L2-226 AC2). */
interface Refused {
  status: 'refused';
  name: string;
}

/**
 * The Write a review screen at /b/:slug/review (L2-227, L2-228): the stars, the item, the text and
 * the notes; checked before it is sent, sent once with an idempotency key, and confirmed in place.
 * A member who may not write is told when they can; one who already wrote is sent to the listing.
 */
@Component({
  selector: 'jb-write-review-page',
  imports: [
    FormsModule,
    RouterLink,
    Alert,
    BackLink,
    Button,
    ChipOption,
    ChipRow,
    EmptyState,
    Field,
    ReviewPosted,
    ReviewSubject,
    Skeleton,
    StarScale,
    Textarea,
    RequiresConnection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'jb-page container container--narrow page' },
  templateUrl: './write-review.page.html',
})
export class WriteReviewPage {
  private readonly api = inject(REVIEWS_API);
  private readonly listings = inject(LISTINGS_API);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly stars = viewChild(StarScale);
  private request?: Subscription;
  /** One key for this review, kept across retries (L2-128, L2-132). */
  private readonly key = newKey();

  protected readonly slug = this.route.snapshot.paramMap.get('slug') ?? '';
  protected readonly words = STAR_WORDS;
  protected readonly max = REVIEW_MAX_LENGTH;

  protected readonly state = signal<LoadState<ReviewForm> | Refused>({ status: 'loading' });
  protected readonly rating = signal<number | null>(null);
  protected readonly itemId = signal<string | null>(null);
  protected readonly text = signal('');
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly failure = signal<{ title: string; text: string; reason: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly posted = signal<ListingReview | null>(null);

  protected readonly form = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  protected readonly space = computed(() => this.form()?.listing.kind === 'space');
  protected readonly prompt = computed(() => (this.space() ? PROMPT_SPACE : PROMPT));
  protected readonly back = computed(() =>
    this.space() ? 'Back to listing' : `Back to ${this.form()?.listing.name ?? ''}`,
  );
  protected readonly meta = computed(() => {
    const form = this.form();
    if (!form) return '';
    return form.listing.kind === 'space'
      ? `Hosted by ${form.listing.ownerName ?? form.listing.name}`
      : form.listing.categoryName;
  });
  protected readonly legend = computed(() =>
    this.form()?.itemLegend === 'product' ? 'Which product?' : 'Which service?',
  );
  protected readonly length = computed(() => this.text().trim().length);
  protected readonly counter = computed(() =>
    this.length() < REVIEW_MIN_LENGTH
      ? `At least ${REVIEW_MIN_LENGTH} characters · ${this.length()}`
      : `Looks good · ${this.length()}`,
  );
  protected readonly word = computed(() => {
    const review = this.posted();
    return review ? STAR_WORDS[review.rating - 1] : '';
  });

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  private load(): void {
    this.request = this.api.form(this.slug).subscribe({
      next: (form) => {
        // The first item is chosen, or the one the address names (L2-227 AC3).
        const asked = this.route.snapshot.queryParamMap.get('item');
        const chosen = form.items.find((item) => item.id === asked) ?? form.items[0];
        this.itemId.set(chosen?.id ?? null);
        this.state.set({ status: 'loaded', value: form });
      },
      error: (error: unknown) => {
        const code = (error as HttpErrorResponse | null)?.error?.code as string | undefined;
        if (error instanceof HttpErrorResponse && error.status === 409) {
          // They already wrote one: their review is on the listing (L2-226 AC5).
          void this.router.navigate(['/b', this.slug], { replaceUrl: true });
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 403 && code) {
          // The owner, or a member without a confirmed request (L2-226 AC2, AC4).
          this.state.set({ status: 'refused', name: '' });
          this.nameRefused();
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 404) {
          void this.router.navigate(['/404'], { skipLocationChange: true });
          return;
        }
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-REV-503') });
      },
    });
  }

  /** The refusal names the listing: its name comes from the listing page's read. */
  private nameRefused(): void {
    this.request = this.listings.getListing(this.slug).subscribe({
      next: (listing) => this.state.set({ status: 'refused', name: listing.name }),
      error: () => this.state.set({ status: 'refused', name: 'this listing' }),
    });
  }

  protected retry(): void {
    this.state.set({ status: 'loading' });
    this.load();
  }

  protected chooseRating(value: number): void {
    this.rating.set(value);
    this.clear('rating');
  }

  protected chooseItem(id: string): void {
    this.itemId.set(id);
    this.clear('itemId');
  }

  protected post(): void {
    const form = this.form();
    if (!form || this.busy()) return;
    const found: Partial<Record<FieldName, string>> = {};
    if (!this.rating()) found.rating = this.message('rating', 'RATING_REQUIRED');
    if (this.length() < REVIEW_MIN_LENGTH) found.text = this.message('text', 'TOO_SHORT');
    else if (this.length() > REVIEW_MAX_LENGTH) found.text = this.message('text', 'TOO_LONG');
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.focusFirstInvalid();
      return;
    }
    this.busy.set(true);
    this.failure.set(null);
    this.api
      .write(
        this.slug,
        { rating: this.rating(), itemId: this.itemId(), text: this.text() },
        this.key,
      )
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: (review) => {
          this.busy.set(false);
          this.posted.set(review);
          afterNextRender(
            () => this.host.querySelector<HTMLElement>('.review-posted__title')?.focus(),
            { injector: this.injector },
          );
        },
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    this.busy.set(false);
    if (error instanceof HttpErrorResponse && error.status === 409) {
      void this.router.navigate(['/b', this.slug]);
      return;
    }
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Partial<Record<FieldName, string>> = {};
      for (const field of ['rating', 'itemId', 'text'] as FieldName[]) {
        if (errors[field]) found[field] = this.message(field, errors[field]);
      }
      if (Object.keys(found).length > 0) {
        this.problems.set(found);
        this.focusFirstInvalid();
        return;
      }
    }
    this.failure.set(
      isRateLimited(error)
        ? {
            title: 'We couldn’t post your review',
            text: `You’re doing that a lot. ${tryAgainIn(error)}`,
            reason: '',
          }
        : {
            title: 'We couldn’t post your review',
            text: 'Your review is still here. Try again.',
            reason: reasonOf(error),
          },
    );
  }

  private message(field: FieldName, code: string): string {
    switch (`${field}:${code}`) {
      case 'rating:RATING_REQUIRED':
        return 'Choose a star rating to post your review.';
      case 'itemId:ITEM_UNKNOWN':
        return this.form()?.itemLegend === 'product'
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

  private clear(field: FieldName): void {
    if (!this.problems()[field]) return;
    this.problems.update((problems) => ({ ...problems, [field]: undefined }));
  }

  /** Focus goes to the first field with a problem, the stars first (L2-126). */
  private focusFirstInvalid(): void {
    afterNextRender(
      () => {
        const found = this.problems();
        if (found.rating) this.stars()?.focus();
        else if (found.itemId)
          (
            this.host.querySelector<HTMLElement>('#rv-item input:checked') ??
            this.host.querySelector<HTMLElement>('#rv-item input')
          )?.focus();
        else this.host.querySelector<HTMLElement>('#rv-text')?.focus();
      },
      { injector: this.injector },
    );
  }
}

/** The reason under the alert (L2-228 AC6): no answer in time, no connection, or the server. */
function reasonOf(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'There’s no connection.';
    return `Jubilee answered with an error (${error.status}).`;
  }
  return 'Jubilee didn’t answer within 10 seconds.';
}
