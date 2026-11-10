import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Placeholder for a grid of business cards while it loads:
 * `<ul jb-card-grid-skeleton [count]="8"></ul>`. It is hidden from assistive technology; the
 * page announces the load with a `role="status"` line.
 */
@Component({
  selector: 'ul[jb-card-grid-skeleton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card-grid', 'aria-hidden': 'true' },
  template: `
    @for (card of cards(); track card) {
      <li class="biz-card">
        <span class="skeleton skeleton--media"></span>
        <span class="skeleton skeleton--text skeleton--w70"></span>
        <span class="skeleton skeleton--text"></span>
        <span class="skeleton skeleton--text skeleton--w50"></span>
      </li>
    }
  `,
})
export class CardGridSkeleton {
  readonly count = input(4);
  protected readonly cards = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
