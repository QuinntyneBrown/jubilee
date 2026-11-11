import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, FieldError, DialogFrame, DialogFooter } from 'components';
import { SessionService } from '../../services/session.service';

/**
 * SignOutDialog (L2-011): asks before signing out, ends this session only and goes to the
 * welcome page. The member stays signed in on their other devices.
 */
@Component({
  selector: 'jb-sign-out-dialog',
  imports: [Button, FieldError, DialogFrame, DialogFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-out.dialog.html',
})
export class SignOutDialog {
  private readonly ref = inject(DialogRef);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }

  protected confirm(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.session.signOut().subscribe({
      next: () => {
        this.ref.close();
        void this.router.navigate(['/welcome']);
      },
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
