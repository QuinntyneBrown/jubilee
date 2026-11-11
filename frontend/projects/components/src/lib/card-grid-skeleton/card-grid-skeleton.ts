import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from 'components';

/**
 * Placeholder for a grid of business cards while it loads:
 * `<ul jb-card-grid-skeleton [count]="8"></ul>`. It is hidden from assistive technology; the
 * page announces the load with a `role="status"` line.
 */
@Component({
  selector: 'ul[jb-card-grid-skeleton]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card-grid', 'aria-hidden': 'true' },
  templateUrl: './card-grid-skeleton.html',
  styleUrl: './card-grid-skeleton.scss',
})
export class CardGridSkeleton {
  readonly count = input(4);
  /** The shape of a card's picture: wide for a business, square for a product. */
  readonly shape = input<'media' | 'square'>('media');
  protected readonly cards = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
