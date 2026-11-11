import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
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
import { Icon, Button, Alert, Field, FieldControl } from 'components';

export interface ApproveListingData {
  id: string;
  name: string;
  ownerFirstName: string;
  category: string;
  /** How many checklist items are not ticked; approving then needs a note (L2-101 AC3). */
  unticked: number;
}

type View = 'form' | 'busy' | 'failed';

/**
 * ApproveListingDialog (L2-101): confirms publishing the listing with the Verified mark. When
 * checklist items are unticked the reviewer must say why; the note goes to the audit log.
 */
@Component({
  selector: 'jb-approve-listing-dialog',
  imports: [FormsModule, Icon, Button, Alert, Field, FieldControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './approve-listing.dialog.html',
})
export class ApproveListingDialog {
  private readonly ref = inject<DialogRef<DecisionResult>>(DialogRef);
  private readonly api = inject(ADMIN_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ApproveListingData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly note = signal('');
  protected readonly invalid = signal(false);
  protected readonly busy = computed(() => this.view() === 'busy');

  protected approve(): void {
    if (this.busy()) return;
    const note = this.note().trim();
    if (this.data.unticked > 0 && !note) {
      this.invalid.set(true);
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#a-note')?.focus());
      return;
    }
    this.invalid.set(false);
    this.view.set('busy');
    this.api.approve(this.data.id, note || null).subscribe({
      next: (result) => this.ref.close(result),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 422) {
          this.invalid.set(true);
          this.view.set('form');
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
