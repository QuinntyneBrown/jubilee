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
  template: `
    <div class="dialog__panel dialog__panel--sm">
      <div class="dialog__header">
        <div class="dialog__icon dialog__icon--info" aria-hidden="true">
          <svg jb-icon name="user"></svg>
        </div>
        <div style="flex: 1">
          <h2 class="dialog__title" id="dlg-title">{{ data.title }}</h2>
          <p id="dlg-desc" class="text-muted" style="margin-top: var(--space-1)">
            Jubilee is free. An account lets businesses reply to you and keeps your bookings in one
            place. We’ll bring you straight back here.
          </p>
        </div>
        <button class="btn btn--ghost btn--icon" type="button" aria-label="Close" (click)="close()">
          <svg jb-icon name="close"></svg>
        </button>
      </div>
      <div class="dialog__footer">
        <a class="btn" routerLink="/sign-in" [queryParams]="back" (click)="close()">Sign in</a>
        <a
          class="btn btn--primary"
          routerLink="/join"
          [queryParams]="back"
          cdkFocusInitial
          (click)="close()"
          >Join free</a
        >
      </div>
    </div>
  `,
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
