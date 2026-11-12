import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  TemplateRef,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { RatingSummary } from '../rating-summary/rating-summary';
import { Review, ReviewView } from '../review/review';
import { Select } from '../select/select';
import { Skeleton } from '../skeleton/skeleton';

/** One review of the section, with the id its actions act on. */
export interface ReviewsItem {
  id: string;
  review: ReviewView;
}

/** The orders the section offers (L2-229 AC3). */
export const REVIEW_SORTS = [
  { value: 'relevant', label: 'Most relevant' },
  { value: 'newest', label: 'Newest' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
] as const;

let nextId = 0;

/**
 * The Reviews section of a listing or a product (L2-228, L2-229, L2-231): the heading with
 * `[slot=action]` ("Write a review"); a `notice`; while loading, placeholders; on an error, the
 * alert with "Try again"; with no reviews, "No reviews yet" with `[slot=empty-action]`; otherwise
 * the summary beside the member's own review, the toolbar (the filter, "Clear" and the sort), the
 * reviews given and "Show all {n} reviews". Each review's actions come from the `actions`
 * template, given the item. The page owns the filter, the order and how many show.
 */
@Component({
  selector: 'section[jb-reviews]',
  imports: [NgTemplateOutlet, Alert, Button, Icon, RatingSummary, Review, Select, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'reviews',
    id: 'reviews',
    '[attr.aria-labelledby]': 'headingId',
    '[attr.aria-busy]': 'state() === "loading" ? "true" : null',
  },
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews {
  readonly state = input<'loading' | 'error' | 'ready'>('ready');
  /** The listing's name, in the empty state and the note on "Verified". */
  readonly name = input.required<string>();
  readonly average = input(0);
  readonly count = input(0);
  readonly breakdown = input<readonly number[]>([0, 0, 0, 0, 0]);
  /** The member's own review, shown first and apart (L2-228 AC7). */
  readonly mine = input<ReviewsItem | null>(null);
  /** The reviews to show, filtered, ordered and cut by the page. */
  readonly items = input<readonly ReviewsItem[]>([]);
  /** How many there are in all when only some show: "Show all {n} reviews". */
  readonly more = input<number | null>(null);
  readonly stars = input<number | null>(null);
  readonly sort = input<string>('relevant');
  readonly notice = input<string | null>(null);
  /** The question of the empty state: "Worked with {name}?" unless given, as for a space or a product (L2-228 AC6, L2-231 AC2). */
  readonly invite = input<string | null>(null);
  /** The error reference quoted in the alert. */
  readonly reference = input('JB-REV-503');
  readonly actions = input<TemplateRef<{ $implicit: ReviewsItem }> | null>(null);

  readonly starsChange = output<number | null>();
  readonly sortChange = output<string>();
  readonly showAll = output<void>();
  readonly retry = output<void>();

  protected readonly sorts = REVIEW_SORTS;
  protected readonly headingId = `jb-reviews-${nextId++}`;
  protected readonly sortId = `${this.headingId}-sort`;
  protected readonly empty = computed(() => this.count() === 0 && !this.mine());
  protected readonly status = computed(() => {
    const stars = this.stars();
    return stars === null
      ? ''
      : `Showing ${this.items().length} ${this.reviewsWord(this.items().length)}`;
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Moves focus to the "Reviews" heading, after a review is removed (L2-232 AC5). */
  focusHeading(): void {
    this.host.querySelector<HTMLElement>(`#${this.headingId}`)?.focus();
  }

  protected reviewsWord(count: number): string {
    return count === 1 ? 'review' : 'reviews';
  }

  protected onSort(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value);
  }
}
