import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { categoryTile } from '../media-tile/category-tile';

/**
 * What a review is about, at the top of the Write a review screen (L2-227 AC1): the category
 * tile, the listing's name and, under it, `meta` (its category, or "Hosted by …" for a space).
 *
 *     <div jb-review-subject name="Legacy Financial" meta="Financial & insurance"
 *          categorySlug="financial-insurance"></div>
 */
@Component({
  selector: 'div[jb-review-subject]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'review-subject' },
  templateUrl: './review-subject.html',
  styleUrl: './review-subject.scss',
})
export class ReviewSubject {
  readonly name = input.required<string>();
  readonly meta = input.required<string>();
  readonly categorySlug = input.required<string>();
  protected readonly tile = computed(() => categoryTile(this.categorySlug()));
}
