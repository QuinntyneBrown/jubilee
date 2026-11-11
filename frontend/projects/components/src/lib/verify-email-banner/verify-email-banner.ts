import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { Button } from '../button/button';
import { CloseButton } from '../button/close-button';

/** The states of the banner that asks an unconfirmed member to confirm the address (L2-005). */
export type VerifyEmailBannerState = 'persistent' | 'sent' | 'bounced' | 'expired' | 'confirmed';

/**
 * The verify-e-mail banner. It carries no dismiss control while the address is unconfirmed.
 *
 *     <div jb-verify-email-banner state="persistent" [email]="address" (resend)="send()"></div>
 */
@Component({
  selector: 'div[jb-verify-email-banner]',
  imports: [Icon, RouterLink, Button, CloseButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'alert banner',
    '[class.alert--danger]': 'state() === "bounced"',
    '[class.alert--success]': 'state() === "confirmed"',
    '[class.alert--warning]': 'state() === "expired"',
    '[attr.role]': 'state() === "bounced" ? "alert" : "status"',
  },
  templateUrl: './verify-email-banner.html',
})
export class VerifyEmailBanner {
  readonly state = input<VerifyEmailBannerState>('persistent');
  readonly email = input.required<string>();
  readonly busy = input(false);
  readonly resend = output<void>();
  /** Only the success state can be dismissed. */
  readonly dismiss = output<void>();
}
