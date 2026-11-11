import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'info' | 'success' | 'warning' | 'danger' | 'solid';

/**
 * A small label for a state, or a count:
 *
 *     <span jb-badge tone="warning">Sold out</span>
 *     <span jb-badge [count]="unread" [label]="unread + ' unread'"></span>
 *
 * A state says itself in its text; the tone only colours it. A count shows "99+" above 99 and
 * is an image named by `label`, so "2" is read as "2 unread" (L2-065). Render a count only
 * when it is above zero.
 */
@Component({
  selector: 'span[jb-badge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'badge',
    '[class]': 'modifier()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label()',
  },
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  /** The colour of a state; none for a neutral one. */
  readonly tone = input<BadgeTone | '' | null | undefined>(null);
  /** The number of a count badge. */
  readonly count = input<number | null>(null);
  /** What assistive technology reads in place of the text: "2 unread". */
  readonly label = input<string | null>(null);

  protected readonly text = computed(() => {
    const count = this.count();
    return count === null ? '' : count > 99 ? '99+' : `${count}`;
  });

  protected readonly modifier = computed(() => {
    if (this.count() !== null) return 'badge--count';
    const tone = this.tone();
    return tone ? `badge--${tone}` : '';
  });
}
