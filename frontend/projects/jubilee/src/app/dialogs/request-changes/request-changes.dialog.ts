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
import { ADMIN_API, CHANGE_AREAS, DecisionResult } from 'api';
import { Icon, Button, Alert, Field, FieldControl, FieldError } from 'components';

export interface RequestChangesData {
  id: string;
  ownerFirstName: string;
}

type View = 'form' | 'busy' | 'failed';

/**
 * RequestChangesDialog (L2-102): pick what needs to change and say it in a message. The listing
 * stays unpublished; the owner gets the message by e-mail and on My business.
 */
@Component({
  selector: 'jb-request-changes-dialog',
  imports: [FormsModule, Icon, Button, Alert, Field, FieldControl, FieldError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './request-changes.dialog.html',
})
export class RequestChangesDialog {
  private readonly ref = inject<DialogRef<DecisionResult>>(DialogRef);
  private readonly api = inject(ADMIN_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<RequestChangesData>(DIALOG_DATA);

  protected readonly areas = CHANGE_AREAS;
  protected readonly view = signal<View>('form');
  protected readonly chosen = signal<string[]>([]);
  protected readonly message = signal('');
  protected readonly messageProblem = signal(false);
  protected readonly areaProblem = signal(false);
  protected readonly busy = computed(() => this.view() === 'busy');

  protected toggle(key: string, on: boolean): void {
    this.chosen.update((list) => (on ? [...list, key] : list.filter((k) => k !== key)));
  }

  protected send(): void {
    if (this.busy()) return;
    const message = this.message().trim();
    this.messageProblem.set(!message);
    this.areaProblem.set(this.chosen().length === 0);
    if (!message || this.chosen().length === 0) {
      setTimeout(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    this.view.set('busy');
    this.api.requestChanges(this.data.id, this.chosen(), message).subscribe({
      next: (result) => this.ref.close(result),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
