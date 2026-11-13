import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { INCOMING_REQUESTS_API, IncomingRequestRow, RequestDecision } from 'api';
import {
  Button,
  Alert,
  DialogFrame,
  DialogBody,
  DialogFooter,
  Card,
  DescriptionList,
  DescriptionItem,
  Price,
} from 'components';
import { requestConflict } from '../confirm-request/confirm-request.dialog';

export interface FulfilRequestData {
  request: IncomingRequestRow;
}

type View = 'form' | 'busy' | 'failed' | 'conflict';

/**
 * FulfilRequestDialog (L2-225): the owner marks a confirmed order fulfilled once the customer has
 * it. Completed is final, so the dialog says what happens before anything does (L2-129).
 */
@Component({
  selector: 'jb-fulfil-request-dialog',
  imports: [
    Button,
    Alert,
    DialogFrame,
    DialogBody,
    DialogFooter,
    Card,
    DescriptionList,
    DescriptionItem,
    Price,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fulfil-request.dialog.html',
})
export class FulfilRequestDialog {
  private readonly ref = inject<DialogRef<RequestDecision>>(DialogRef);
  private readonly api = inject(INCOMING_REQUESTS_API);
  protected readonly request = inject<FulfilRequestData>(DIALOG_DATA).request;

  protected readonly view = signal<View>('form');
  /** What the server said when the order can no longer be fulfilled, such as a cancellation. */
  protected readonly conflict = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly firstName = this.request.customerName.split(' ')[0];

  protected fulfil(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.fulfil(this.request.id).subscribe({
      next: (decision) => this.ref.close(decision),
      error: (error: unknown) => {
        const conflict = requestConflict(error);
        if (conflict !== null) {
          this.conflict.set(conflict);
          this.view.set('conflict');
          return;
        }
        this.view.set('failed');
      },
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
