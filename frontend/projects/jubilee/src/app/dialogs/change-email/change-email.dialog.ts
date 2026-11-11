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
import { Icon, Button, Alert, Field, Input } from 'components';

export interface ChangeEmailData {
  /** A member who joined with Google has no password to give. */
  hasPassword: boolean;
}

type View = 'form' | 'busy' | 'failed' | 'sent';
type FieldName = 'email' | 'currentPassword';

const MESSAGES: Record<string, string> = {
  'email:REQUIRED': 'Enter the e-mail you want to use.',
  'email:EMAIL_INVALID': 'Enter a full e-mail address, like name@example.com.',
  'email:EMAIL_IN_USE': 'An account already uses this e-mail.',
  'currentPassword:CURRENT_PASSWORD_INCORRECT': 'That isn’t your current password.',
};

/**
 * ChangeEmailDialog (L2-014): the new address and the current password. The link goes to the new
 * address and the address in use stays until it is opened. The password field is cleared after a
 * refusal and nothing else is (L2-126).
 */
@Component({
  selector: 'jb-change-email-dialog',
  imports: [FormsModule, Icon, Button, Alert, Field, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './change-email.dialog.html',
})
export class ChangeEmailDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(PROFILE_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ChangeEmailData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly problems = signal<Partial<Record<FieldName, string>>>({});
  protected readonly sentTo = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');

  protected send(): void {
    if (this.busy()) return;
    const email = this.email().trim();
    const found: Partial<Record<FieldName, string>> = {};
    if (!email) found.email = MESSAGES['email:REQUIRED'];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      found.email = MESSAGES['email:EMAIL_INVALID'];
    if (this.data.hasPassword && !this.password())
      found.currentPassword = MESSAGES['currentPassword:CURRENT_PASSWORD_INCORRECT'];
    this.problems.set(found);
    if (Object.keys(found).length > 0) {
      this.focusFirstInvalid();
      return;
    }
    this.view.set('busy');
    this.api.requestEmailChange({ email, currentPassword: this.password() }).subscribe({
      next: () => {
        this.sentTo.set(email);
        this.view.set('sent');
      },
      error: (error: unknown) => this.fail(error),
    });
  }

  private fail(error: unknown): void {
    this.password.set('');
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors = (error.error as { errors?: Record<string, string> } | null)?.errors ?? {};
      const found: Partial<Record<FieldName, string>> = {};
      for (const field of ['email', 'currentPassword'] as FieldName[]) {
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

  private focusFirstInvalid(): void {
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
