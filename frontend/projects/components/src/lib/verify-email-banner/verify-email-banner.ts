import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Alert, AlertTone } from '../alert/alert';
import { Button } from '../button/button';
import { CloseButton } from '../button/close-button';

/** The states of the banner that asks an unconfirmed member to confirm the address (L2-005). */
export type VerifyEmailBannerState = 'persistent' | 'sent' | 'bounced' | 'expired' | 'confirmed';

/**
 * The verify-e-mail banner. It carries no dismiss control while the address is unconfirmed.
 *
 *     <div jb-verify-email-banner state="persistent" [email]="address" (resend)="send()"
 *       (changeEmail)="open($event)"></div>
 */
@Component({
  selector: 'div[jb-verify-email-banner]',
  imports: [Alert, Button, CloseButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email-banner.html',
  styleUrl: './verify-email-banner.scss',
})
export class VerifyEmailBanner {
  readonly state = input<VerifyEmailBannerState>('persistent');
  readonly email = input.required<string>();
  readonly busy = input(false);
  readonly resend = output<void>();
  /** "Change e-mail" was pressed; carries the button, for focus to return to. */
  readonly changeEmail = output<HTMLElement>();
  /** Only the success state can be dismissed. */
  readonly dismiss = output<void>();

  protected readonly tone = computed<AlertTone>(() => {
    switch (this.state()) {
      case 'bounced':
        return 'danger';
      case 'confirmed':
        return 'success';
      case 'expired':
        return 'warning';
      default:
        return 'info';
    }
  });
}
