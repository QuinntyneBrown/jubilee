import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  Injector,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ListingReview, ReviewItemOption, ReviewSort, fullDate } from 'api';
import { Button, Icon, Reviews, ReviewsItem, ReviewView, ToastService } from 'components';
import { RequiresConnection } from '../../directives/requires-connection';
import {
  SignInRequiredData,
  SignInRequiredDialog,
} from '../../dialogs/sign-in-required/sign-in-required.dialog';
import { EditReviewData, EditReviewDialog } from '../../dialogs/edit-review/edit-review.dialog';
import {
  RemoveReviewData,
  RemoveReviewDialog,
} from '../../dialogs/remove-review/remove-review.dialog';
import { ReplyReviewData, ReplyReviewDialog } from '../../dialogs/reply-review/reply-review.dialog';
import {
  ReportReviewData,
  ReportReviewDialog,
} from '../../dialogs/report-review/report-review.dialog';
import { ListingReviewsStore } from '../../services/listing-reviews.store';
import { SessionService } from '../../services/session.service';

/** One review of the section, with the review it was drawn from. */
interface Item extends ReviewsItem {
  source: ListingReview;
}

/**
 * The "Reviews" section of a listing or a product page (L2-228, L2-229, L2-231): it draws the
 * reviews of the page's `ListingReviewsStore` with `jb-reviews`, offers "Write a review" to those
 * who may write (L2-225), and gives each review the actions of the viewer.
 */
@Component({
  selector: 'jb-listing-reviews',
  imports: [Button, Icon, Reviews, RequiresConnection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './listing-reviews.html',
})
export class ListingReviews {
  /** The listing's slug and name. */
  readonly slug = input.required<string>();
  readonly name = input.required<string>();
  /** The product the reviews are about, on a product page: "Write a review" chooses it. */
  readonly itemId = input<string | null>(null);
  /** The question of the empty state, when not "Worked with {name}?". */
  readonly invite = input<string | null>(null);
  /** The author edits or removes their review here; on a product page only from the listing's page. */
  readonly changes = input(true);
  /** What a review may be about, for the Edit dialog (L2-232 AC1). */
  readonly items = input<ReviewItemOption[]>([]);
  readonly itemLegend = input<'service' | 'product' | null>(null);
  readonly space = input(false);

  protected readonly store = inject(ListingReviewsStore);
  private readonly session = inject(SessionService);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly section = viewChild.required(Reviews);

  protected readonly status = computed(() => {
    const state = this.store.state();
    return state.status === 'loaded' ? 'ready' : state.status;
  });

  protected readonly reference = computed(() => {
    const state = this.store.state();
    return state.status === 'error' ? state.reference : 'JB-REV-503';
  });

  /** "Write a review" is offered to a visitor and to an eligible member (L2-225 AC1, AC3). */
  protected readonly canWrite = computed(() => {
    const writing = this.store.writing();
    return writing === 'eligible' || writing === 'sign-in';
  });

  protected readonly notice = computed(() =>
    this.store.state().status === 'loaded' && this.store.writing() === 'not-eligible'
      ? `You can review ${this.name()} after they confirm a request of yours.`
      : null,
  );

  /** The Write a review screen, with the product chosen on a product page (L2-231 AC3). */
  protected readonly writeHref = computed(
    () => `/b/${this.slug()}/review${this.itemId() ? `?item=${this.itemId()}` : ''}`,
  );

  protected readonly mine = computed<Item | null>(() => {
    const mine = this.store.mine();
    return mine ? toItem(mine) : null;
  });

  protected readonly shown = computed<Item[]>(() => this.store.shown().map(toItem));

  /** The viewer's relation to the listing: what each review offers them (L2-228 AC8). */
  protected readonly viewer = this.store.viewer;

  /** A visitor is asked to join first and comes back to the form (L2-225 AC3). */
  protected write(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    if (this.session.member()) {
      void this.router.navigateByUrl(this.writeHref());
      return;
    }
    this.dialog.open<void, SignInRequiredData>(SignInRequiredDialog, {
      data: { title: `Join to review ${this.name()}`, returnUrl: this.writeHref() },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
      restoreFocus: event.currentTarget as HTMLElement,
    });
  }

  protected sortBy(sort: string): void {
    this.store.order(sort as ReviewSort);
  }

  /** The rest show in place, and focus moves to the first one added (L2-228 AC4). */
  protected showAll(): void {
    const first = this.store.shown().length;
    this.store.showAll();
    afterNextRender(
      () => {
        const added = this.host.querySelectorAll<HTMLElement>('.reviews__list article')[first];
        if (!added) return;
        added.setAttribute('tabindex', '-1');
        added.focus();
      },
      { injector: this.injector },
    );
  }

  /** "Edit": the author changes their review in a dialog (L2-232 AC1 to AC4). */
  protected edit(review: ListingReview, button: HTMLElement): void {
    const ref = this.dialog.open<ListingReview, EditReviewData>(EditReviewDialog, {
      data: {
        review,
        listingName: this.name(),
        items: this.items(),
        itemLegend: this.itemLegend(),
        space: this.space(),
      },
      ...DIALOG,
      restoreFocus: button,
    });
    ref.closed.subscribe((changed) => {
      if (!changed) return;
      this.store.replace(changed);
      this.toasts.show({ tone: 'success', title: 'Review updated' });
    });
  }

  /** "Remove": asked first, then the review goes and focus moves to "Reviews" (L2-232 AC5). */
  protected remove(review: ListingReview, button: HTMLElement): void {
    const ref = this.dialog.open<boolean, RemoveReviewData>(RemoveReviewDialog, {
      data: { reviewId: review.id, listingName: this.name() },
      ...DIALOG,
      restoreFocus: button,
    });
    ref.closed.subscribe((removed) => {
      if (!removed) return;
      this.store.remove(review.id);
      this.toasts.show({ tone: 'success', title: 'Review removed' });
      afterNextRender(() => this.focusHeading(), { injector: this.injector });
    });
  }

  /** "Reply" or "Edit reply": the owner's one public answer (L2-233). */
  protected reply(review: ListingReview, button: HTMLElement): void {
    const first = review.reply === null;
    const ref = this.dialog.open<ListingReview, ReplyReviewData>(ReplyReviewDialog, {
      data: { review },
      ...DIALOG,
      restoreFocus: button,
    });
    ref.closed.subscribe((answered) => {
      if (!answered) return;
      this.store.replace(answered);
      this.toasts.show({ tone: 'success', title: first ? 'Reply posted' : 'Reply updated' });
      // The button now reads "Edit reply"; focus returns to it (L2-233 AC3).
      afterNextRender(
        () =>
          this.host
            .querySelector<HTMLElement>(
              `[aria-label="Edit reply to ${CSS.escape(answered.author)}"]`,
            )
            ?.focus(),
        { injector: this.injector },
      );
    });
  }

  /** "Report": privately, to the verification team (L2-235). */
  protected report(review: ListingReview, button: HTMLElement): void {
    this.dialog.open<void, ReportReviewData>(ReportReviewDialog, {
      data: { reviewId: review.id, author: review.author },
      ...DIALOG,
      restoreFocus: button,
    });
  }

  /** After a removal, focus moves to the "Reviews" heading (L2-232 AC5). */
  focusHeading(): void {
    this.section().focusHeading();
  }
}

const DIALOG = {
  ariaLabelledBy: 'dlg-title',
  ariaDescribedBy: 'dlg-desc',
  ariaModal: true,
  backdropClass: 'backdrop',
} as const;

function toItem(review: ListingReview): Item {
  const view: ReviewView = {
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
  return { id: review.id, review: view, source: review };
}
