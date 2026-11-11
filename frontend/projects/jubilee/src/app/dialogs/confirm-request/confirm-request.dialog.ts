import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
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

export interface ConfirmRequestData {
  request: IncomingRequestRow;
}

type View = 'form' | 'busy' | 'failed' | 'conflict';

/** What the customer asked for, in the words of a sentence. */
export function requestNoun(kind: IncomingRequestRow['kind']): string {
  return kind === 'order' ? 'order' : kind === 'booking' ? 'booking' : 'quote request';
}

/** ConfirmRequestDialog (L2-052): the owner confirms an order, a booking or a quote request. */
@Component({
  selector: 'jb-confirm-request-dialog',
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
  templateUrl: './confirm-request.dialog.html',
})
export class ConfirmRequestDialog {
  private readonly ref = inject<DialogRef<RequestDecision>>(DialogRef);
  private readonly api = inject(INCOMING_REQUESTS_API);
  protected readonly request = inject<ConfirmRequestData>(DIALOG_DATA).request;

  protected readonly view = signal<View>('form');
  /** What the server said when the request can no longer be confirmed, such as a cancellation. */
  protected readonly conflict = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly firstName = this.request.customerName.split(' ')[0];
  protected readonly noun = requestNoun(this.request.kind);
  protected readonly whenLabel = this.request.kind === 'booking' ? 'When' : 'Needed by';

  protected confirm(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.confirm(this.request.id).subscribe({
      next: (decision) => this.ref.close(decision),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.conflict.set(
            (error.error as { detail?: string } | null)?.detail ?? 'This request has changed.',
          );
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
