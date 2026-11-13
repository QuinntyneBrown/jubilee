import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * The compact rating of a card (L2-231 AC4): one gold star, the average to one decimal and the
 * count in brackets, said in words to assistive technology.
 *
 *     <span jb-rating-inline [average]="4.6" [count]="5"></span>
 */
@Component({
  selector: 'span[jb-rating-inline]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rating-inline' },
  templateUrl: './rating-inline.html',
  styleUrl: './rating-inline.scss',
})
export class RatingInline {
  readonly average = input.required<number>();
  readonly count = input.required<number>();
  protected readonly shown = computed(() => this.average().toFixed(1));
}
