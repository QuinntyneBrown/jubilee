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

/**
 * How a confirmation ended when its dialog was already closed (L2-052 AC5, AC7): confirmed, or not,
 * with the server's sentence when the request can no longer be confirmed.
 */
export type LateConfirmation =
  { confirmed: true; decision: RequestDecision } | { confirmed: false; conflict: string | null };

export interface ConfirmRequestData {
  request: IncomingRequestRow;
  /** Told the answer when the dialog was closed before it came, so it is still reported. */
  settled?: (outcome: LateConfirmation) => void;
}

/** What the server said when a request can no longer be answered, such as a cancellation; null for any other failure. */
export function requestConflict(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
  return (error.error as { detail?: string } | null)?.detail ?? 'This request has changed.';
}

type View = 'form' | 'busy' | 'failed' | 'conflict';

/** What the customer asked for, in the words of a sentence. */
export function requestNoun(kind: IncomingRequestRow['kind']): string {
  return kind === 'order'
    ? 'order'
    : kind === 'booking'
      ? 'booking'
      : kind === 'space'
        ? 'request'
        : 'quote request';
}

/**
 * ConfirmRequestDialog (L2-052): the owner confirms an order, a booking, a quote request or a
 * space request. Confirming a space gives the member its exact address (L2-207 AC2).
 */
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
  private readonly data = inject<ConfirmRequestData>(DIALOG_DATA);
  protected readonly request = this.data.request;
  /** False once the dialog is closed; Escape closes it even while the answer is on its way. */
  private open = true;

  protected readonly view = signal<View>('form');
  /** What the server said when the request can no longer be confirmed, such as a cancellation. */
  protected readonly conflict = signal('');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly firstName = this.request.customerName.split(' ')[0];
  protected readonly noun = requestNoun(this.request.kind);
  protected readonly isSpace = this.request.kind === 'space';
  protected readonly whenLabel =
    this.request.kind === 'booking' || this.isSpace ? 'When' : 'Needed by';
  protected readonly description = this.isSpace
    ? `Only confirm if the space is free then. ${this.firstName} gets your exact address when you confirm.`
    : `Only confirm if you can fulfil “${this.request.title}”.`;

  constructor() {
    this.ref.closed.subscribe(() => (this.open = false));
  }

  protected confirm(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.confirm(this.request.id).subscribe({
      next: (decision) => {
        if (this.open) this.ref.close(decision);
        else this.data.settled?.({ confirmed: true, decision });
      },
      error: (error: unknown) => {
        const conflict = requestConflict(error);
        if (!this.open) {
          this.data.settled?.({ confirmed: false, conflict });
          return;
        }
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
