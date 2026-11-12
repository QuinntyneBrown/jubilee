import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button, FieldError, DialogFrame, DialogFooter } from 'components';
import { SessionService } from '../../services/session.service';

/**
 * SignOutOthersDialog (L2-011 AC4, AC5): asks before every other session of the member is ended.
 * This session stays. It closes with `true` once the other devices are signed out.
 */
@Component({
  selector: 'jb-sign-out-others-dialog',
  imports: [Button, FieldError, DialogFrame, DialogFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-out-others.dialog.html',
})
export class SignOutOthersDialog {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly session = inject(SessionService);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly description = describe(this.session.otherSessionCount());

  protected close(): void {
    if (!this.busy()) this.ref.close(false);
  }

  protected confirm(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.session.signOutOthers().subscribe({
      next: () => this.ref.close(true),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}

function describe(others: number): string {
  const devices = others === 1 ? 'Your 1 other device is' : `Your ${others} other devices are`;
  return `${devices} signed out at once. You stay signed in on this phone.`;
}
