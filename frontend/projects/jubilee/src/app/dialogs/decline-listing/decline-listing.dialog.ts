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
import { ADMIN_API, DecisionResult } from 'api';
import { Icon, Button, Alert } from 'components';

export interface DeclineListingData {
  id: string;
  name: string;
  ownerFirstName: string;
}

type View = 'form' | 'busy' | 'failed';

/** DeclineListingDialog (L2-104): closes a listing the church reference could not vouch for, with a reason. */
@Component({
  selector: 'jb-decline-listing-dialog',
  imports: [FormsModule, Icon, Button, Alert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './decline-listing.dialog.html',
})
export class DeclineListingDialog {
  private readonly ref = inject<DialogRef<DecisionResult>>(DialogRef);
  private readonly api = inject(ADMIN_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<DeclineListingData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly reason = signal('');
  protected readonly problem = signal(false);
  protected readonly busy = computed(() => this.view() === 'busy');

  protected send(): void {
    if (this.busy()) return;
    const reason = this.reason().trim();
    this.problem.set(!reason);
    if (!reason) {
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#d-reason')?.focus());
      return;
    }
    this.view.set('busy');
    this.api.decline(this.data.id, reason).subscribe({
      next: (result) => this.ref.close(result),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
