import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The price a `jb-row` ends with. `free` says the word is "Free", not an amount. */
@Component({
  selector: 'span[jb-row-price]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'row__price', '[class.row__price--free]': 'free()' },
  templateUrl: './row-price.html',
  styleUrl: './row-price.scss',
})
export class RowPrice {
  readonly free = input(false, { transform: booleanAttribute });
}
