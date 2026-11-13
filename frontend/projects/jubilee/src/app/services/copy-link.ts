import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** How long "Copied ✓" stays on the button (L2-038 AC2, L2-244 AC2). */
const COPIED_MS = 2000;

/**
 * Copies a listing's address to the clipboard and says so for 2 seconds (L2-244 AC2). A page
 * that shows "Your address" with "Copy" provides one of its own.
 */
@Injectable()
export class CopyLink {
  private readonly document = inject(DOCUMENT);
  /** True for 2 seconds after a copy: the button reads "Copied ✓" and the status says so. */
  readonly copied = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  /** Puts `url` on the clipboard; without clipboard permission, through a selection in `field`. */
  async copy(url: string, field: HTMLInputElement): Promise<void> {
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(url);
    } catch {
      // The field shows the address without its scheme, so the link is put in for the copy.
      const shown = field.value;
      field.value = url;
      field.select();
      this.document.execCommand('copy');
      field.value = shown;
    }
    this.copied.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copied.set(false), COPIED_MS);
  }
}
