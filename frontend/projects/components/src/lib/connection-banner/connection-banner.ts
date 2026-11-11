import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** What the banner says about the connection (L2-067, L2-121). */
export type ConnectionBannerKind = 'offline' | 'unreachable' | 'slow' | 'back-online';

/**
 * The connection banner. Every kind but "back-online" stays until the condition clears and has no
 * dismiss control; "back-online" is shown once and can be dismissed. It is a polite live region, so a
 * change is announced without moving focus.
 *
 *     <div jb-connection-banner kind="offline" detail="…" (retry)="check()"></div>
 */
@Component({
  selector: 'div[jb-connection-banner]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'alert banner',
    '[class.alert--warning]': 'kind() === "offline" || kind() === "slow"',
    '[class.alert--danger]': 'kind() === "unreachable"',
    '[class.alert--success]': 'kind() === "back-online"',
    role: 'status',
  },
  templateUrl: './connection-banner.html',
})
export class ConnectionBanner {
  readonly kind = input.required<ConnectionBannerKind>();
  /** After "You're offline.": what still works and what waits. */
  readonly detail = input<string | null>(null);
  /** Seconds until the next attempt while Jubilee cannot be reached; null when none is waiting. */
  readonly countdown = input<number | null>(null);
  /** How many saved messages were just sent, for "back-online". */
  readonly sent = input(0);
  /** Where "Check status" goes. */
  readonly statusUrl = input('');
  readonly retry = output<void>();
  readonly dismiss = output<void>();
}
