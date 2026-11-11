import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { Textarea } from '../textarea/textarea';

let nextId = 0;

/**
 * Where a message is written and sent: one line that takes more, and "Send".
 *
 *     <form jb-composer label="Message Legacy Financial" [(value)]="text" (sent)="send()">
 *       <jb-attach-photo slot="leading" … />
 *     </form>
 *
 * Enter sends and Shift+Enter breaks the line; so does "Send". `sent` carries the text as it
 * was written: the page decides whether there is something to send, and clears `value`.
 */
@Component({
  selector: 'form[jb-composer]',
  imports: [Button, Icon, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'composer', '(submit)': 'submit($event)' },
  templateUrl: './composer.html',
  styleUrl: './composer.scss',
})
export class Composer {
  /** The accessible name of the text control: "Message Legacy Financial". */
  readonly label = input.required<string>();
  readonly placeholder = input('Write a message');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly maxLength = input<number | null>(null);
  /** The text being written. */
  readonly value = model('');

  readonly sent = output<string>();

  protected readonly id = `jb-composer-${nextId++}`;

  protected submit(event: Event): void {
    event.preventDefault();
    this.sent.emit(this.value());
  }

  protected onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (key.shiftKey || key.isComposing) return;
    this.submit(event);
  }
}
