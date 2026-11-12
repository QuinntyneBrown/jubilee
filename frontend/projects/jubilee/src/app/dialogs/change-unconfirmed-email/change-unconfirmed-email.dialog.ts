import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ACCOUNT_API, isRateLimited, tryAgainIn } from 'api';
import { Alert, Button, DialogBody, DialogFooter, DialogFrame, Field, Input } from 'components';
import { SessionService } from '../../services/session.service';
import { guardClose } from '../guard-close';

type View = 'form' | 'busy' | 'sent';

const REQUIRED = 'Enter the e-mail you want to use.';
const INVALID = 'Enter a full e-mail address, like name@example.com.';
const IN_USE = 'An account already uses this e-mail. Use another address.';

/**
 * ChangeUnconfirmedEmailDialog (L2-004 AC5, AC8 to AC10): "Use another e-mail". An unconfirmed member
 * replaces a mistyped address; no password is asked, because the address is not proven yet (ADR 0047).
 * The API answers the same whether or not the address was free (L2-141 AC1), so the dialog reads the
 * session afterwards: the address it reports says whether the new one was taken.
 */
@Component({
  selector: 'jb-change-unconfirmed-email-dialog',
  imports: [FormsModule, Alert, Button, DialogBody, DialogFooter, DialogFrame, Field, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-unconfirmed-email.dialog.html',
})
export class ChangeUnconfirmedEmailDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly api = inject(ACCOUNT_API);
  private readonly session = inject(SessionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The address the earlier link went to; it does not change while the dialog is open. */
  protected readonly current = this.session.member()?.email ?? '';
  protected readonly view = signal<View>('form');
  protected readonly email = signal('');
  protected readonly problem = signal<string | null>(null);
  /** What stopped the request, when it was not the address: the limit, or a failure. */
  protected readonly notice = signal<{ heading: string; text: string; limited: boolean } | null>(
    null,
  );
  protected readonly sentTo = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');

  constructor() {
    guardClose(this.ref, inject(DestroyRef), () => this.close());
  }

  protected send(): void {
    if (this.busy()) return;
    const email = this.email().trim();
    this.notice.set(null);
    if (!email) return this.refuse(REQUIRED);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.refuse(INVALID);
    this.problem.set(null);
    this.view.set('busy');
    this.api.changeUnconfirmedEmail(email).subscribe({
      next: () => this.confirmReplaced(email),
      error: (error: unknown) => this.fail(error),
    });
  }

  /** The session says which address the member has now. */
  private confirmReplaced(email: string): void {
    this.session.resolve().subscribe(() => {
      if (this.session.member()?.email.toLowerCase() === email.toLowerCase()) {
        this.sentTo.set(email);
        this.view.set('sent');
      } else {
        this.view.set('form');
        this.refuse(IN_USE);
      }
    });
  }

  private fail(error: unknown): void {
    this.view.set('form');
    if (error instanceof HttpErrorResponse && error.status === 422) {
      this.refuse(INVALID);
    } else if (isRateLimited(error)) {
      this.notice.set({
        heading: 'You’re doing that a lot.',
        text: tryAgainIn(error),
        limited: true,
      });
    } else {
      this.notice.set({
        heading: 'We couldn’t send that',
        text: 'Nothing was changed and what you typed is still here. Try again.',
        limited: false,
      });
    }
  }

  private refuse(message: string): void {
    this.problem.set(message);
    setTimeout(() =>
      this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}

/** Opens "Use another e-mail"; focus returns to `opener` when it closes. */
export function openChangeUnconfirmedEmail(dialog: Dialog, opener: HTMLElement): void {
  dialog.open<void>(ChangeUnconfirmedEmailDialog, {
    ariaLabelledBy: 'dlg-title',
    ariaDescribedBy: 'dlg-desc',
    ariaModal: true,
    backdropClass: 'backdrop',
    // Escape and a click outside are the dialog's to decide: it does not close while sending.
    disableClose: true,
    restoreFocus: opener,
  });
}
