import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Stars } from '../stars/stars';

/**
 * The rating under a listing's name (L2-229 AC1): the stars, the average and "{n} reviews", one
 * link to the Reviews section; with no reviews, the plain line "No reviews yet".
 *
 *     <a jb-rating-link [average]="4.6" [count]="5" routerLink="." fragment="reviews"></a>
 *     <p jb-rating-link [average]="0" [count]="0"></p>
 */
@Component({
  selector: 'a[jb-rating-link], p[jb-rating-link]',
  imports: [Stars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rating-link', '[class.rating-link--none]': 'count() === 0' },
  templateUrl: './rating-link.html',
  styleUrl: './rating-link.scss',
})
export class RatingLink {
  readonly average = input.required<number>();
  readonly count = input.required<number>();
  protected readonly shown = computed(() => this.average().toFixed(1));
}
