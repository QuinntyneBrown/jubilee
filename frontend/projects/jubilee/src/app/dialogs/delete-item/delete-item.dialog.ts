import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CATALOGUE_API, DeletedItem } from 'api';
import { Button, Alert, DialogFrame, DialogBody, DialogFooter } from 'components';
import { timeout } from 'rxjs';

export interface DeleteItemData {
  kind: 'product' | 'service';
  id: string;
  name: string;
  /** Requests for a product, all time; shown in the consequence. */
  pastRequests: number;
}

type View = 'form' | 'busy' | 'failed';

/** DeleteItemDialog (L2-092, L2-095): the owner deletes a product or a service after seeing the consequence. */
@Component({
  selector: 'jb-delete-item-dialog',
  imports: [Button, Alert, DialogFrame, DialogBody, DialogFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-item.dialog.html',
})
export class DeleteItemDialog {
  private readonly ref = inject<DialogRef<DeletedItem>>(DialogRef);
  private readonly api = inject(CATALOGUE_API);
  protected readonly data = inject<DeleteItemData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');

  protected readonly consequence = computed(() => {
    if (this.data.kind === 'service') {
      return 'Members can no longer ask for it. Open quote requests stay open. This can’t be undone.';
    }
    const count = this.data.pastRequests;
    const records =
      count === 0
        ? 'It has no past requests.'
        : count === 1
          ? 'The 1 past request for it stays in your records.'
          : `The ${count} past requests for it stay in your records.`;
    return `It disappears from your shop now. ${records} This can’t be undone.`;
  });

  protected delete(): void {
    if (this.busy()) return;
    this.view.set('busy');
    const call =
      this.data.kind === 'product'
        ? this.api.deleteProduct(this.data.id)
        : this.api.deleteService(this.data.id);
    call.pipe(timeout(10_000)).subscribe({
      next: (deleted) => this.ref.close(deleted),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
