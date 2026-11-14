import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * The bag, with the number of shirts in it (L2-265 AC6). Its name says the number in words
 * ("Bag, 2 items"); the count is filled ink when the bag holds something.
 *
 *     <button jb-bag-button type="button" [count]="bag.count()" (click)="open()"></button>
 */
@Component({
  selector: 'button[jb-bag-button]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bag-button', '[attr.aria-label]': 'name()' },
  templateUrl: './bag-button.html',
  styleUrl: './bag-button.scss',
})
export class BagButton {
  readonly count = input(0);
  protected readonly name = computed(
    () => `Bag, ${this.count()} item${this.count() === 1 ? '' : 's'}`,
  );
}
