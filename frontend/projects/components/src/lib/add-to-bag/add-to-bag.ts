import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The quantity and "Add to bag · $25", then, once added, "Added to bag" with a check and the line
 * that was added with "Check out" (L2-265). The quantity stepper is projected before the button.
 *
 *     <div jb-add-to-bag [amount]="'$25'" [added]="added()" (add)="add()" (checkout)="open()">
 *       <div jb-quantity-stepper …></div>
 *     </div>
 */
@Component({
  selector: 'div[jb-add-to-bag]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'add-to-bag' },
  templateUrl: './add-to-bag.html',
  styleUrl: './add-to-bag.scss',
})
export class AddToBag {
  /** The amount on the button: "$50". */
  readonly amount = input.required<string>();
  /** What was just added ("Men’s L · Black"), or null. */
  readonly added = input<string | null>(null);
  readonly add = output<void>();
  readonly checkout = output<void>();
}
