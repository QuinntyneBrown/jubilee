import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from 'components';
import { SessionService } from '../../services/session.service';
import { SignOutDialog } from '../sign-out/sign-out.dialog';

/** UserMenuDialog: the account menu behind the avatar and the "You" tab, ending in "Sign out". */
@Component({
  selector: 'jb-user-menu-dialog',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)' },
  templateUrl: './user-menu.dialog.html',
})
export class UserMenuDialog {
  private readonly ref = inject(DialogRef);
  private readonly dialog = inject(Dialog);
  protected readonly member = inject(SessionService).member;

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected close(): void {
    this.ref.close();
  }

  protected signOut(): void {
    this.ref.close();
    this.dialog.open(SignOutDialog, {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
  }
}
