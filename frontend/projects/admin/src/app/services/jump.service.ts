import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { JumpDialog } from '../dialogs/jump/jump.dialog';

/**
 * Opens "Jump to" (L2-273 AC1): from ⌘K or Ctrl K anywhere in the shell, "Jump to a table or
 * record" or the search button that stands in for it on a phone. One palette at a time.
 */
@Injectable({ providedIn: 'root' })
export class JumpService {
  private readonly dialog = inject(Dialog);
  private ref: DialogRef<void> | null = null;

  open(): void {
    if (this.ref) return;
    this.ref = this.dialog.open<void>(JumpDialog, {
      ariaLabel: 'Jump to',
      ariaModal: true,
      hasBackdrop: false,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: 'first-tabbable',
    });
    this.ref.closed.subscribe(() => (this.ref = null));
  }

  /** ⌘K on macOS, Ctrl K elsewhere. */
  keydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.open();
    }
  }
}
