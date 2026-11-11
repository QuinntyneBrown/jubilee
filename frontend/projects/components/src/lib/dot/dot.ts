import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The small dot that goes before a status in words; it takes the colour of the text.
 * `pulse` is for work under way ("Saving…"). It is decoration: the words say the state.
 */
@Component({
  selector: 'span[jb-dot]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dot', '[class.dot--pulse]': 'pulse()', 'aria-hidden': 'true' },
  templateUrl: './dot.html',
  styleUrl: './dot.scss',
})
export class Dot {
  readonly pulse = input(false, { transform: booleanAttribute });
}
