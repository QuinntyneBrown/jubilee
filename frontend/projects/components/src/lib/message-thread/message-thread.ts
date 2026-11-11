import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The messages of a conversation, oldest first: `jb-message-day` separators, `jb-message-bubble`
 * and `jb-request-card` items. On a `div` it holds what stands in for an empty conversation.
 *
 *     <ul jb-message-thread aria-label="Messages">
 *       <li jb-message-day>Today</li>
 *       <li jb-message-bubble sender="Trevor" text="See you then!" meta="9:14 a.m."></li>
 *     </ul>
 */
@Component({
  selector: 'ul[jb-message-thread], div[jb-message-thread]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chat__log' },
  templateUrl: './message-thread.html',
  styleUrl: './message-thread.scss',
})
export class MessageThread {}
