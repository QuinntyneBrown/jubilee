import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DECLINE_REASONS, INCOMING_REQUESTS_API, IncomingRequestRow, RequestDecision } from 'api';
import { Icon, Button, Alert, Field, Select, Textarea } from 'components';
import { requestNoun } from '../confirm-request/confirm-request.dialog';

export interface DeclineRequestData {
  request: IncomingRequestRow;
}

type View = 'form' | 'busy' | 'failed';

/** The most a decline message can say (L2-053). */
const MAX_MESSAGE = 1000;

/** DeclineRequestDialog (L2-053): the owner declines with a reason and a kind note. */
@Component({
  selector: 'jb-decline-request-dialog',
  imports: [FormsModule, Icon, Button, Alert, Field, Select, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './decline-request.dialog.html',
})
export class DeclineRequestDialog {
  private readonly ref = inject<DialogRef<RequestDecision>>(DialogRef);
  private readonly api = inject(INCOMING_REQUESTS_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly request = inject<DeclineRequestData>(DIALOG_DATA).request;

  protected readonly reasons = DECLINE_REASONS;
  protected readonly maxMessage = MAX_MESSAGE;
  protected readonly firstName = this.request.customerName.split(' ')[0];
  protected readonly noun = requestNoun(this.request.kind);

  protected readonly view = signal<View>('form');
  protected readonly reason = signal(DECLINE_REASONS[0].value);
  protected readonly message = signal('');
  protected readonly problem = signal<'required' | null>(null);
  protected readonly busy = computed(() => this.view() === 'busy');

  protected send(): void {
    if (this.busy()) return;
    const message = this.message().trim();
    const problem = !message;
    this.problem.set(problem ? 'required' : null);
    if (problem) {
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#d-msg')?.focus());
      return;
    }
    this.view.set('busy');
    this.api.decline(this.request.id, this.reason(), message).subscribe({
      next: (decision) => this.ref.close(decision),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
