import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, Button, FieldError } from 'components';
import { SessionService } from '../../services/session.service';

/**
 * SignOutDialog (L2-011): asks before signing out, ends this session only and goes to the
 * welcome page. The member stays signed in on their other devices.
 */
@Component({
  selector: 'jb-sign-out-dialog',
  imports: [Icon, Button, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)' },
  templateUrl: './sign-out.dialog.html',
})
export class SignOutDialog {
  private readonly ref = inject(DialogRef);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

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
