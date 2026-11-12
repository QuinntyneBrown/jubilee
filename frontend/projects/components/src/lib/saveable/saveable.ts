import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * A card with its heart (L2-041 AC7, ADR 0054):
 * `<div jb-saveable [name]="b.name" [saved]="…" [busy]="…" (pressed)="…"><a jb-business-card …></a></div>`.
 * The card stays a link; the heart is a toggle button beside it, over the top right of its picture.
 * Saved is said by the name, `aria-pressed` and the filled shape; a busy heart carries `aria-busy`.
 */
@Component({
  selector: 'div[jb-saveable]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'saveable' },
  templateUrl: './saveable.html',
  styleUrl: './saveable.scss',
})
export class Saveable {
  /** The item the heart saves, for its accessible name. */
  readonly name = input.required<string>();
  readonly saved = input(false);
  /** The save or removal is on its way: the heart says so and the page ignores presses. */
  readonly busy = input(false);
  /** The heart was pressed; the button is given for focus to return to. */
  readonly pressed = output<HTMLButtonElement>();
}
