import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PROFILE_API } from 'api';
import { Icon, Button, Alert, FieldControl, Field } from 'components';

export interface ChangePasswordData {
  /** False for a member who joined with Google: the dialog is "Set a password" (L2-015 AC5). */
  hasPassword: boolean;
}

type View = 'form' | 'busy' | 'failed';
type FieldName = 'currentPassword' | 'newPassword' | 'repeatPassword';

const MESSAGES: Record<string, string> = {
  'currentPassword:CURRENT_PASSWORD_INCORRECT': 'That isn’t your current password.',
  'newPassword:REQUIRED': 'Choose a new password.',
  'newPassword:PASSWORD_TOO_SHORT': 'Use at least 10 characters.',
  'newPassword:TOO_LONG': 'Use 128 characters or fewer.',
  'newPassword:PASSWORD_BREACHED':
    'That password has appeared in a data breach. Choose one you haven’t used elsewhere.',
  'repeatPassword:PASSWORDS_DIFFER': 'The two passwords are different.',
};

/**
 * ChangePasswordDialog (L2-015): the current password and the new one twice, or "Set a password"
 * without the current one. Password fields are cleared after a refusal; nothing else is (L2-126).
 */
@Component({
  selector: 'jb-change-password-dialog',
  imports: [FormsModule, Icon, Button, Alert, Field, FieldControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './change-password.dialog.html',
})
export class ChangePasswordDialog {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(PROFILE_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ChangePasswordData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly repeat = signal('');
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly busy = computed(() => this.view() === 'busy');

  protected save(): void {
    if (this.busy()) return;
    const found: Partial<Record<FieldName, string>> = {};
    if (this.data.hasPassword && !this.current())
      found.currentPassword = MESSAGES['currentPassword:CURRENT_PASSWORD_INCORRECT'];
    if (!this.next()) found.newPassword = MESSAGES['newPassword:REQUIRED'];
    else if (this.next().length < 10)
      found.newPassword = MESSAGES['newPassword:PASSWORD_TOO_SHORT'];
    else if (this.next() !== this.repeat())
      found.repeatPassword = MESSAGES['repeatPassword:PASSWORDS_DIFFER'];
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.clearPasswords();
      this.focusFirstInvalid();
      return;
    }
    this.view.set('busy');
    this.api
      .changePassword({
        currentPassword: this.data.hasPassword ? this.current() : null,
        newPassword: this.next(),
        repeatPassword: this.repeat(),
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: (error: unknown) => this.fail(error),
      });
  }

  private fail(error: unknown): void {
    this.clearPasswords();
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Partial<Record<FieldName, string>> = {};
      for (const field of ['currentPassword', 'newPassword', 'repeatPassword'] as FieldName[]) {
        if (errors[field])
          found[field] = MESSAGES[`${field}:${errors[field]}`] ?? 'Check this field.';
      }
      this.problems.set(found);
      this.view.set('form');
      this.focusFirstInvalid();
      return;
    }
    this.view.set('failed');
  }

  private clearPasswords(): void {
    this.current.set('');
    this.next.set('');
    this.repeat.set('');
  }

  private focusFirstInvalid(): void {
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }

  protected close(): void {
    if (!this.busy()) this.ref.close(false);
  }
}
