import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * One figure on a card: what it counts, the figure and a note under it.
 *
 *     <div jb-stat label="Listing views, 7 days" [value]="312" note="↑ 18% on last week"
 *          trend="up"></div>
 *
 * `trend` colours the note of a figure that rose or fell; the note says which way in words or
 * with an arrow as well. `loading` draws the card of a figure that is not known yet.
 */
@Component({
  selector: 'div[jb-stat]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card', '[class.stat]': '!loading()' },
  templateUrl: './stat.html',
  styleUrl: './stat.scss',
})
export class Stat {
  readonly label = input('');
  readonly value = input<string | number>('');
  readonly note = input('');
  readonly trend = input<'up' | 'down' | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
}
