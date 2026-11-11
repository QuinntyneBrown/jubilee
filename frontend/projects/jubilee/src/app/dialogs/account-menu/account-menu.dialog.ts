import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from 'components';
import { SignOutDialog } from '../sign-out/sign-out.dialog';

export interface AccountMenuData {
  displayName: string;
  initials: string;
  email: string;
  ownsListing: boolean;
  isVerifier: boolean;
}

/**
 * AccountMenuDialog (L2-019): the personal links behind the avatar. From 640 px up it hangs under
 * the avatar and arrow keys move between the items; under 640 px it is a bottom sheet. Escape
 * closes it and the opener puts focus back on the avatar.
 */
@Component({
  selector: 'jb-account-menu-dialog',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)', '(keydown)': 'move($event)' },
  styleUrl: './account-menu.dialog.scss',
  templateUrl: './account-menu.dialog.html',
})
export class AccountMenuDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly dialog = inject(Dialog);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<AccountMenuData>(DIALOG_DATA);

  protected close(): void {
    this.ref.close();
  }

  /** "Sign out" asks first, then ends this session only (L2-011). */
  protected signOut(): void {
    this.ref.close();
    this.dialog.open(SignOutDialog, {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      backdropClass: 'backdrop',
    });
  }

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected move(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.menu__item'));
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'ArrowDown'
        ? items[(at + 1) % items.length]
        : items[(at - 1 + items.length) % items.length];
    event.preventDefault();
    next?.focus();
  }
}
