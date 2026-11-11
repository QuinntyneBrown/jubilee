import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { formatPrice } from '../format/format';

/**
 * A price, in bold tabular figures that never wrap.
 *
 *     <span jb-price [amount]="product.priceCents" [perUnit]="product.perUnit"></span>
 *     <span jb-price>{{ estimate.total }}</span>
 *
 * `amount` is in cents and is written as dollars, "each" after it with `perUnit`. Words that are
 * a price already ("Free", "Ask", an estimate the server wrote) are projected instead.
 */
@Component({
  selector: 'span[jb-price], p[jb-price]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'price', '[class.price--lg]': 'size() === "lg"' },
  templateUrl: './price.html',
  styleUrl: './price.scss',
})
export class Price {
  readonly amount = input<number | null>(null);
  readonly perUnit = input(false, { transform: booleanAttribute });
  readonly size = input<'md' | 'lg'>('md');

  protected readonly text = computed(() => {
    const cents = this.amount();
    return cents === null ? '' : formatPrice(cents, this.perUnit());
  });
}
