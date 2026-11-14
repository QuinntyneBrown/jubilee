import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { Tee } from '../tee/tee';

/**
 * One line of the bag (L2-266 AC1): the shirt small, its name, fit and size, the amount, the
 * quantity (projected) and "Remove"; what is wrong with the line is said under it in words.
 *
 *     <li jb-bag-line name="Purpose Tee · Black" meta="Men’s L · $25 each" amount="$25.00"
 *       removeLabel="Remove Men’s L" (remove)="remove()"><div jb-quantity-stepper …></div></li>
 */
@Component({
  selector: 'li[jb-bag-line]',
  imports: [Icon, Tee],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bag-line' },
  templateUrl: './bag-line.html',
  styleUrl: './bag-line.scss',
})
export class BagLine {
  readonly name = input.required<string>();
  readonly meta = input.required<string>();
  readonly amount = input.required<string>();
  readonly removeLabel = input.required<string>();
  readonly problem = input<string | null>(null);
  readonly disabled = input(false);
  readonly remove = output<void>();
}
