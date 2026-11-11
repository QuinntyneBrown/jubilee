import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/** The pages that are never replaced by the offline page: the app's own background reads. */
const BACKGROUND = ['/api/session', '/api/me/', '/api/health/'];

export function isBackgroundRead(url: string): boolean {
  return BACKGROUND.some((prefix) => url.startsWith(prefix));
}

/**
 * OfflineNavigation (L2-122): replaces a page that cannot load while the device is offline with the
 * offline page, without changing the address, so a reload or the return of the connection opens
 * the page that was asked for.
 */
@Injectable({ providedIn: 'root' })
export class OfflineNavigation {
  private readonly router = inject(Router);

  /** Shows the offline page for `returnUrl` (the current address by default). */
  show(returnUrl: string = this.router.url): void {
    if (/^\/offline(\?|$)/.test(this.router.url)) return;
    void this.router.navigate(['/offline'], { skipLocationChange: true, state: { returnUrl } });
  }
}
