import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Alert, AlertTone } from '../alert/alert';
import { Icon } from '../icon/icon';
import { Button } from '../button/button';
import { CloseButton } from '../button/close-button';

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
  imports: [Alert, Icon, Button, CloseButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connection-banner.html',
  styleUrl: './connection-banner.scss',
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

  protected readonly tone = computed<AlertTone>(() => {
    switch (this.kind()) {
      case 'unreachable':
        return 'danger';
      case 'back-online':
        return 'success';
      default:
        return 'warning';
    }
  });
}
