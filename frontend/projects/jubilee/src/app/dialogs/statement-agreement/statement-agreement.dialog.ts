import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { STATEMENT_OF_FAITH_API, StatementDue, longDay } from 'api';
import { Alert, Button, DialogBody, DialogFooter, DialogFrame, ToastService } from 'components';
import { SessionService } from '../../services/session.service';
import { guardClose } from '../guard-close';

type View = 'ask' | 'busy' | 'failed';

/**
 * StatementAgreementDialog (L2-075 AC3 to AC6): the statement of faith was updated and the owner,
 * whose latest agreement is to an earlier version, reads it and agrees. "Not now" leaves it for the
 * next opening of the app; My business keeps "Read and agree" meanwhile.
 */
@Component({
  selector: 'jb-statement-agreement-dialog',
  imports: [Alert, Button, DialogBody, DialogFooter, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statement-agreement.dialog.html',
})
export class StatementAgreementDialog {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(STATEMENT_OF_FAITH_API);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);
  protected readonly due = inject<StatementDue>(DIALOG_DATA);

  protected readonly view = signal<View>('ask');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly description = computed(() => {
    const due = this.due;
    return due.overdue
      ? `${due.business} is paused until you agree to the updated statement of faith. We updated it on ${longDay(due.updatedOn)}.`
      : `We updated Jubilee’s statement of faith on ${longDay(due.updatedOn)}. Read it and agree by ${longDay(due.agreeBy)} to keep your listing on Jubilee.`;
  });

  constructor() {
    // Escape and a click outside are "Not now", except while the agreement is being recorded.
    guardClose(this.ref, inject(DestroyRef), () => this.close());
  }

  protected agree(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.agree(this.due.version).subscribe({
      next: () => {
        this.session.statementAgreed();
        this.toasts.show({
          tone: 'success',
          title: 'Thank you',
          text: 'Your agreement to the statement of faith is recorded.',
        });
        this.ref.close(true);
      },
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close(false);
  }
}

/** Opens the dialog; focus goes back to `opener` when it closes. True when the owner agreed. */
export function openStatementAgreement(
  dialog: Dialog,
  due: StatementDue,
  opener?: HTMLElement,
): DialogRef<boolean, StatementAgreementDialog> {
  return dialog.open<boolean, StatementDue, StatementAgreementDialog>(StatementAgreementDialog, {
    data: due,
    ariaLabelledBy: 'dlg-title',
    ariaDescribedBy: 'dlg-desc',
    ariaModal: true,
    backdropClass: 'backdrop',
    disableClose: true,
    ...(opener ? { restoreFocus: opener } : {}),
  });
}
