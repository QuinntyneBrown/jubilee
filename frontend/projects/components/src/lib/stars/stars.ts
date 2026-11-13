import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A rating shown, never chosen: five stars filled to the exact value, so 4.6 fills six tenths of
 * the fifth (L2-229 AC2).
 *
 *     <span jb-stars [value]="4.6" label="Rated 4.6 out of 5"></span>
 *
 * With a `label` the host is one image named by it; without one it is decoration, hidden from
 * assistive technology, and the text around it says the rating.
 */
@Component({
  selector: 'span[jb-stars]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'stars',
    '[class.stars--sm]': 'size() === "sm"',
    '[class.stars--lg]': 'size() === "lg"',
    '[attr.role]': 'label() ? "img" : null',
    '[attr.aria-label]': 'label()',
    '[attr.aria-hidden]': 'label() ? null : "true"',
  },
  templateUrl: './stars.html',
  styleUrl: './stars.scss',
})
export class Stars {
  readonly value = input.required<number>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly label = input<string | null>(null);

  /** The share of each of the five stars that is filled, in percent. */
  protected readonly fills = computed(() =>
    [0, 1, 2, 3, 4].map((i) => Math.round(Math.min(1, Math.max(0, this.value() - i)) * 100)),
  );
}
