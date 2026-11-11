import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MY_BUSINESS_API, PauseResult } from 'api';
import { Icon, Button } from 'components';

export interface PauseListingData {
  business: string;
  openRequests: number;
}

type View = 'form' | 'busy' | 'failed';

/** PauseListingDialog (L2-096): the owner hides the listing after seeing what stays. */
@Component({
  selector: 'jb-pause-listing-dialog',
  imports: [Icon, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dialog' },
  templateUrl: './pause-listing.dialog.html',
})
export class PauseListingDialog {
  private readonly ref = inject<DialogRef<PauseResult>>(DialogRef);
  private readonly api = inject(MY_BUSINESS_API);
  protected readonly data = inject<PauseListingData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');

  protected pause(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api.pause().subscribe({
      next: (result) => this.ref.close(result),
      error: () => this.view.set('failed'),
    });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
