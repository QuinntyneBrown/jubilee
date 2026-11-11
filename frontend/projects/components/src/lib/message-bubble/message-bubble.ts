import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/** Where a message stands: confirmed by the server, on its way, or not sent. */
export type BubbleState = 'sent' | 'pending' | 'failed';

/**
 * One message of a conversation, with at most one photo:
 *
 *     <li jb-message-bubble sender="Trevor" text="See you then!" meta="9:14 a.m."></li>
 *     <li jb-message-bubble mine sender="You" state="failed" text="…"
 *         meta="Not sent. Check your connection." (retry)="…" (discard)="…"></li>
 *
 * `meta` is the time, or what is happening to the message. A pending message announces its meta
 * politely; a failed one is an alert and offers "Try again" and "Delete". `placeholder` draws the
 * bubble of a conversation that is still loading, that share of the log wide.
 */
@Component({
  selector: 'li[jb-message-bubble]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bubble',
    '[class.bubble--me]': 'mine()',
    '[class.bubble--pending]': 'state() === "pending"',
    '[class.bubble--failed]': 'state() === "failed"',
    '[attr.role]': 'state() === "failed" ? "alert" : null',
    '[style.width.%]': 'placeholder()',
  },
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.scss',
})
export class MessageBubble {
  /** The viewer wrote it. */
  readonly mine = input(false, { transform: booleanAttribute });
  readonly state = input<BubbleState>('sent');
  /** Who wrote it, for assistive technology: "You" or the sender's first name. */
  readonly sender = input('');
  readonly text = input('');
  readonly meta = input('');
  /** The address of the message's photo, when it has one. */
  readonly photo = input<string | null>(null);
  /** The message has a photo that cannot be shown. */
  readonly photoMissing = input(false, { transform: booleanAttribute });
  readonly placeholder = input<number | null>(null);

  readonly retry = output<void>();
  readonly discard = output<void>();
  /** "View photo" was pressed. */
  readonly viewPhoto = output<void>();
  /** The photo did not load: its address may have expired. */
  readonly photoFailed = output<void>();

  protected readonly photoAlt = computed(() => `Photo from ${this.mine() ? 'you' : this.sender()}`);
}
