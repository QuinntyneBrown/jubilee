import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * A whole number from `min` to `max`, with "One fewer" and "One more" around it (L2-265 AC1). The
 * number is an <output> announced as it changes; `label` names the group ("Quantity of Men’s L").
 *
 *     <div jb-quantity-stepper [value]="qty()" [max]="max()" (valueChange)="qty.set($event)"></div>
 */
@Component({
  selector: 'div[jb-quantity-stepper]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'quantity-stepper',
    role: 'group',
    '[class.quantity-stepper--sm]': 'size() === "sm"',
    '[attr.aria-label]': 'label()',
  },
  templateUrl: './quantity-stepper.html',
  styleUrl: './quantity-stepper.scss',
})
export class QuantityStepper {
  readonly value = input.required<number>();
  readonly min = input(1);
  readonly max = input(10);
  readonly label = input('Quantity');
  readonly size = input<'md' | 'sm'>('md');
  readonly disabled = input(false);
  readonly valueChange = output<number>();
}
