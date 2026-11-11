import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';

/**
 * One conversation in the list of messages: who it is with, when the last message came and how
 * it begins.
 *
 *     <a jb-thread-row name="Legacy Financial" time="9:14 a.m." preview="See you then!"
 *        unread [current]="open" routerLink="/messages/1"></a>
 *
 * An unread conversation says so in words as well as with its dot and its weight; a muted one
 * says so in words. `current` marks the open conversation (`aria-current="page"`).
 */
@Component({
  selector: 'a[jb-thread-row]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'thread',
    '[class.thread--unread]': 'unread()',
    '[attr.aria-current]': 'current() ? "page" : null',
  },
  templateUrl: './thread-row.html',
  styleUrl: './thread-row.scss',
})
export class ThreadRow {
  readonly name = input.required<string>();
  readonly preview = input('');
  readonly time = input('');
  readonly unread = input(false, { transform: booleanAttribute });
  readonly muted = input(false, { transform: booleanAttribute });
  readonly current = input(false, { transform: booleanAttribute });
}
