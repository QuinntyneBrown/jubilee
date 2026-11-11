import { DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ACCOUNT_DATA_API, DeletionSummary } from 'api';
import { Icon, Button, Alert, Field, Input } from 'components';

type View = 'loading' | 'form' | 'busy' | 'failed' | 'unavailable';

const PHRASE = 'DELETE';

/**
 * DeleteAccountDialog (L2-017): names the account, says what is deleted with live counts, and deletes it
 * once the member has typed DELETE. A failure keeps what was typed (L2-128).
 */
@Component({
  selector: 'jb-delete-account-dialog',
  imports: [FormsModule, Icon, Button, Alert, Field, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './delete-account.dialog.html',
})
export class DeleteAccountDialog implements OnInit {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(ACCOUNT_DATA_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly view = signal<View>('loading');
  protected readonly summary = signal<DeletionSummary | null>(null);
  protected readonly typed = signal('');
  protected readonly problem = signal(false);
  protected readonly busy = computed(() => this.view() === 'busy');

  ngOnInit(): void {
    this.api.deletionSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.view.set('form');
      },
      error: () => this.view.set('unavailable'),
    });
  }

  protected plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
  }

  protected remove(): void {
    if (this.busy()) return;
    // Only the word itself, in capitals, deletes (L2-017 AC2); the server checks it again.
    if (this.typed() !== PHRASE) {
      this.problem.set(true);
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#d-confirm')?.focus());
      return;
    }
    this.problem.set(false);
    this.view.set('busy');
    this.api.deleteAccount(this.typed()).subscribe({
      next: () => this.ref.close(true),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 422) {
          this.problem.set(true);
          this.view.set('form');
          return;
        }
        this.view.set('failed');
      },
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close(false);
  }
}
