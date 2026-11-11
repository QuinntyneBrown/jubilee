import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CancelDecision, REQUESTS_API } from 'api';
import { Icon, Button } from 'components';

export interface CancelRequestData {
  id: string;
  /** "booking", "quote request" or "order". */
  noun: string;
  business: string;
  ownerFirstName: string;
  /** A confirmed booking that starts within 24 hours (L2-049 AC5). */
  shortNotice: boolean;
}

type View = 'form' | 'busy' | 'failed';

/** CancelRequestDialog (L2-049): the member cancels an open request after seeing the consequence. */
@Component({
  selector: 'jb-cancel-request-dialog',
  imports: [Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './cancel-request.dialog.html',
})
export class CancelRequestDialog {
  private readonly ref = inject<DialogRef<CancelDecision>>(DialogRef);
  private readonly api = inject(REQUESTS_API);
  protected readonly data = inject<CancelRequestData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');

  protected cancel(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.cancel(this.data.id).subscribe({
      next: (decision) => this.ref.close(decision),
      error: (error: unknown) => {
        // The request changed under the member, such as an owner who declined it a moment ago: the page reloads it.
        if (error instanceof HttpErrorResponse && error.status === 409) this.ref.close();
        else this.view.set('failed');
      },
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
