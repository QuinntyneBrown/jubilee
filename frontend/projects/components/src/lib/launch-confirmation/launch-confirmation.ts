import { ChangeDetectionStrategy, Component, ElementRef, inject, input } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * What takes the place of a launch form once it is sent (L2-216 AC5, L2-217 AC4):
 *
 *     <div jb-launch-confirmation heading="You’re on the list." tone="paper">
 *       We’ll e-mail joanna@example.com the day Jubilee launches, and not before.
 *     </div>
 *
 * It is a status: the page calls `focus()` when it appears, so that a screen reader reads it.
 * The check is decoration; the heading says what happened.
 */
@Component({
  selector: 'div[jb-launch-confirmation]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mkt-confirmation',
    role: 'status',
    tabindex: '-1',
    '[class.mkt-confirmation--paper]': 'tone() === "paper"',
  },
  templateUrl: './launch-confirmation.html',
  styleUrl: './launch-confirmation.scss',
})
export class LaunchConfirmation {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly heading = input.required<string>();
  readonly tone = input<'surface' | 'paper'>('surface');

  /** Moves focus to the confirmation. */
  focus(): void {
    this.host.nativeElement.focus();
  }
}
