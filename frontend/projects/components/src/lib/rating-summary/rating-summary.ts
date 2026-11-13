import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Stars } from '../stars/stars';

/**
 * The summary of a listing's reviews (L2-229 AC2, L2-230 AC1): the average large, its stars and
 * the count; one bar for each of 5 to 1 stars, each a toggle that filters the list.
 *
 *     <div jb-rating-summary [average]="4.6" [count]="5" [breakdown]="[3, 2, 0, 0, 0]"
 *          [selected]="stars()" (selectedChange)="stars.set($event)"></div>
 *
 * `breakdown` holds the counts of 5, 4, 3, 2 and 1 stars. Pressing the pressed bar again clears
 * the filter (null).
 */
@Component({
  selector: 'div[jb-rating-summary]',
  imports: [Stars],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rating-summary' },
  templateUrl: './rating-summary.html',
  styleUrl: './rating-summary.scss',
})
export class RatingSummary {
  readonly average = input.required<number>();
  readonly count = input.required<number>();
  readonly breakdown = input.required<readonly number[]>();
  readonly selected = input<number | null>(null);
  readonly selectedChange = output<number | null>();

  protected readonly shown = computed(() => this.average().toFixed(1));

  protected readonly bars = computed(() => {
    const counts = this.breakdown();
    const most = Math.max(1, ...counts);
    return counts.map((count, i) => ({
      stars: 5 - i,
      count,
      width: Math.round((count / most) * 100),
    }));
  });

  protected toggle(stars: number): void {
    this.selectedChange.emit(this.selected() === stars ? null : stars);
  }
}
