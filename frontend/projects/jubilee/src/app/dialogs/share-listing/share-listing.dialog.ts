import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import {
  Button,
  Field,
  Input,
  InputGroup,
  DialogFrame,
  DialogBody,
  DialogFooter,
} from 'components';
import { listingAddress } from 'api';

export interface ShareListingData {
  slug: string;
  /** The listing's address, where the API states one (L2-244). */
  address?: string | null;
  businessName: string;
}

/** How long "Copied ✓" stays on the button (L2-038 AC2). */
const COPIED_MS = 2000;

/**
 * ShareListingDialog (L2-038, L2-244): the listing's address with "Copy", "E-mail", "WhatsApp"
 * and, where the device has a share sheet, "More…". Anyone can share, signed in or not.
 */
@Component({
  selector: 'jb-share-listing-dialog',
  imports: [Button, Field, Input, InputGroup, DialogFrame, DialogBody, DialogFooter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-listing.dialog.html',
})
export class ShareListingDialog {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<ShareListingData>(DIALOG_DATA);

  /** The listing's address, or its page on this host where it has none (L2-244 AC1, AC6). */
  protected readonly url = listingAddress(
    this.data.address,
    this.data.slug,
    this.document.location.origin,
  ).url;
  protected readonly mailto = `mailto:?subject=${encodeURIComponent(`${this.data.businessName} on Jubilee`)}&body=${encodeURIComponent(this.url)}`;
  protected readonly whatsapp = `https://wa.me/?text=${encodeURIComponent(`${this.data.businessName} on Jubilee ${this.url}`)}`;
  /** Whether this device has a share sheet; "More…" is hidden where it has none (L2-038 AC3). */
  protected readonly canShare = typeof this.document.defaultView?.navigator.share === 'function';
  protected readonly copied = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected async copy(): Promise<void> {
    const view = this.document.defaultView;
    try {
      await view?.navigator.clipboard.writeText(this.url);
    } catch {
      // No clipboard permission: select the link so the member can copy it by hand.
      const input = this.host.nativeElement.querySelector<HTMLInputElement>('#d-link');
      input?.select();
      this.document.execCommand('copy');
    }
    this.copied.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copied.set(false), COPIED_MS);
  }

  protected async more(): Promise<void> {
    try {
      await this.document.defaultView?.navigator.share({
        title: `${this.data.businessName} on Jubilee`,
        url: this.url,
      });
    } catch {
      // The member closed the share sheet; nothing to do.
    }
  }

  protected close(): void {
    clearTimeout(this.timer);
    this.ref.close();
  }
}
