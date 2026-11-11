import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * A list of rows that is loading, on the list itself:
 *
 *     <ul jb-row-list-skeleton [count]="4" leading="avatar" action></ul>
 *
 * It is hidden from assistive technology; the page announces "Loading…" itself.
 */
@Component({
  selector: 'ul[jb-row-list-skeleton]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'rows', 'aria-hidden': 'true' },
  templateUrl: './row-list-skeleton.html',
  styleUrl: './row-list-skeleton.scss',
})
export class RowListSkeleton {
  readonly count = input(3, { transform: numberAttribute });
  /** What stands before the two lines of a row: an avatar, a thumbnail, or nothing. */
  readonly leading = input<'avatar' | 'thumb' | null>(null);
  /** The width of the second line, in percent. */
  readonly detail = input<30 | 70>(70);
  /** The row ends with an action. */
  readonly action = input(false, { transform: booleanAttribute });

  protected readonly rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
