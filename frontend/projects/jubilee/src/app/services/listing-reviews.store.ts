import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  ListingReview,
  ListingReviews,
  LoadState,
  REVIEWS_API,
  ReviewSort,
  errorReference,
  filterReviews,
  sortReviews,
  summarize,
} from 'api';
import { Subscription } from 'rxjs';

/** How many reviews show before "Show all {n} reviews" (L2-229 AC4). */
const FIRST = 3;

/**
 * The reviews of one listing or one product, for the page that shows them (L2-229, L2-230,
 * L2-232). Provided by the page, so the rating under the name and the "Reviews" section read the
 * same answer. The summary is counted from the reviews held, so an edit or a removal redraws it
 * (L2-238 AC9).
 */
@Injectable()
export class ListingReviewsStore {
  private readonly api = inject(REVIEWS_API);
  private request?: Subscription;
  private slug = '';
  private product?: string;

  readonly state = signal<LoadState<ListingReviews>>({ status: 'loading' });
  readonly stars = signal<number | null>(null);
  readonly sort = signal<ReviewSort>('relevant');
  readonly all = signal(false);

  private readonly loaded = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.value : null;
  });

  readonly viewer = computed(() => this.loaded()?.viewer ?? 'visitor');
  readonly writing = computed(() => this.loaded()?.writing ?? 'sign-in');
  readonly summary = computed(() => summarize(this.loaded()?.items ?? []));

  /** The member's own review, shown first and apart (L2-229 AC7). */
  readonly mine = computed(() => this.loaded()?.items.find((r) => r.mine) ?? null);

  /** The others, filtered and ordered (L2-230). */
  readonly ordered = computed(() => {
    const others = (this.loaded()?.items ?? []).filter((r) => !r.mine);
    return sortReviews(filterReviews(others, this.stars()), this.sort(), new Date());
  });

  readonly shown = computed(() => (this.all() ? this.ordered() : this.ordered().slice(0, FIRST)));
  readonly more = computed(() =>
    this.all() || this.ordered().length <= FIRST ? null : this.ordered().length,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  load(slug: string, product?: string): void {
    this.slug = slug;
    this.product = product;
    this.reload();
  }

  reload(): void {
    this.request?.unsubscribe();
    this.state.set({ status: 'loading' });
    this.request = this.api.listingReviews(this.slug, this.product).subscribe({
      next: (value) => this.state.set({ status: 'loaded', value }),
      error: (error: unknown) =>
        this.state.set({ status: 'error', reference: errorReference(error, 'JB-REV-503') }),
    });
  }

  filter(stars: number | null): void {
    this.stars.set(stars);
    this.all.set(false);
  }

  order(sort: ReviewSort): void {
    this.sort.set(sort);
    this.all.set(false);
  }

  showAll(): void {
    this.all.set(true);
  }

  /** A review as the API answered it after an edit or a reply. */
  replace(review: ListingReview): void {
    this.patch((items) => items.map((r) => (r.id === review.id ? review : r)));
  }

  /** The member removed their review: they may write one again (L2-233 AC5). */
  remove(id: string): void {
    this.patch((items) => items.filter((r) => r.id !== id), 'eligible');
  }

  private patch(
    change: (items: ListingReview[]) => ListingReview[],
    writing?: ListingReviews['writing'],
  ): void {
    const state = this.state();
    if (state.status !== 'loaded') return;
    this.state.set({
      status: 'loaded',
      value: {
        ...state.value,
        items: change(state.value.items),
        writing: writing ?? state.value.writing,
      },
    });
  }
}
