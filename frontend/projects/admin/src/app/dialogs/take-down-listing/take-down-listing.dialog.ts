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
import { ADMIN_API, AdminListing } from 'api';
import { Alert, Button, DialogBody, DialogFooter, DialogFrame, Field, Textarea } from 'components';

export interface TakeDownListingData {
  id: string;
  name: string;
  ownerFirstName: string;
}

type View = 'form' | 'busy' | 'failed';

/**
 * TakeDownListingDialog (L2-101): takes a listing that misrepresents a business off Jubilee, with
 * a reason the owner is e-mailed. Closes with the listing as it now stands.
 */
@Component({
  selector: 'jb-take-down-listing-dialog',
  imports: [FormsModule, Alert, Button, DialogBody, DialogFooter, DialogFrame, Field, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './take-down-listing.dialog.html',
})
export class TakeDownListingDialog {
  private readonly ref = inject<DialogRef<AdminListing>>(DialogRef);
  private readonly api = inject(ADMIN_API);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<TakeDownListingData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly reason = signal('');
  protected readonly problem = signal(false);
  protected readonly busy = computed(() => this.view() === 'busy');

  protected send(): void {
    if (this.busy()) return;
    const reason = this.reason().trim();
    this.problem.set(!reason);
    if (!reason) {
      setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#t-reason')?.focus());
      return;
    }
    this.view.set('busy');
    this.api.takeDown(this.data.id, reason).subscribe({
      next: (listing) => this.ref.close(listing),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
