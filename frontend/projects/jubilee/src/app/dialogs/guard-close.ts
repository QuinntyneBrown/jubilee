import { DialogRef } from '@angular/cdk/dialog';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

/**
 * Sends every way of closing an editor dialog (Escape and a click outside) to one decision, so a
 * dialog with typed input can ask to discard it instead of losing it (L2-130 AC3). The opener
 * sets `disableClose` so the dialog never closes by itself.
 */
export function guardClose(
  ref: Pick<DialogRef<never>, 'keydownEvents' | 'backdropClick'>,
  destroyRef: DestroyRef,
  attempt: () => void,
): void {
  ref.keydownEvents
    .pipe(
      filter((event) => event.key === 'Escape'),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((event) => {
      event.preventDefault();
      attempt();
    });
  ref.backdropClick.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => attempt());
}

/** The words of a failed save: a dropped connection is told apart from a refusal (L2-128 AC2). */
export function failureText(status: number | undefined, what: string): string {
  return status === 0
    ? 'Your connection dropped before it reached us. Nothing was sent and what you typed is still here. Try again.'
    : `We couldn’t save the ${what}. Nothing was changed and what you typed is still here. Try again.`;
}
