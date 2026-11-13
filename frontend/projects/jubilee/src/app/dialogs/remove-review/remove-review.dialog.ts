import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { REVIEWS_API, isRateLimited, tryAgainIn } from 'api';
import { Alert, Button, DialogBody, DialogFooter, DialogFrame } from 'components';
import { timeout } from 'rxjs';

export interface RemoveReviewData {
  reviewId: string;
  listingName: string;
}

type View = 'form' | 'busy' | 'failed';

/** A removal that takes longer than this fails instead of spinning (L2-127 AC2). */
const SUBMIT_TIMEOUT_MS = 10_000;

/** RemoveReviewDialog (L2-233 AC4): the author takes their review off the page; closes with `true` once it is. */
@Component({
  selector: 'jb-remove-review-dialog',
  imports: [Alert, Button, DialogBody, DialogFooter, DialogFrame],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './remove-review.dialog.html',
})
export class RemoveReviewDialog {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(REVIEWS_API);
  protected readonly data = inject<RemoveReviewData>(DIALOG_DATA);

  protected readonly view = signal<View>('form');
  protected readonly busy = computed(() => this.view() === 'busy');
  protected readonly failure = signal({ title: '', text: '' });

  protected remove(): void {
    if (this.busy()) return;
    this.view.set('busy');
    this.api
      .remove(this.data.reviewId)
      .pipe(timeout(SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error: unknown) => {
          this.failure.set(
            isRateLimited(error)
              ? { title: `You’re doing that a lot. ${tryAgainIn(error)}`, text: '' }
              : {
                  title: 'We couldn’t remove your review',
                  text: 'It is still on their page. Try again.',
                },
          );
          this.view.set('failed');
        },
      });
  }

  protected close(): void {
    if (!this.busy()) this.ref.close();
  }
}
