import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from 'components';

export interface SignInRequiredData {
  /** For example "Join to be told when it’s back". */
  title: string;
  /** Where sign-in or joining brings the visitor back to. */
  returnUrl: string;
}

/**
 * SignInRequiredDialog (L2-012): a visitor's action needs an account. It offers "Sign in" and
 * "Join free", which bring the visitor back to `returnUrl`.
 */
@Component({
  selector: 'jb-sign-in-required-dialog',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog', '(click)': 'closeIfOutside($event)' },
  templateUrl: './sign-in-required.dialog.html',
})
export class SignInRequiredDialog {
  private readonly ref = inject(DialogRef);
  protected readonly data = inject<SignInRequiredData>(DIALOG_DATA);
  protected readonly back = { returnUrl: this.data.returnUrl };

  protected closeIfOutside(event: Event): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected close(): void {
    this.ref.close();
  }
}
