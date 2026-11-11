import { Injectable, inject, signal } from '@angular/core';
import { NAVIGATION_API, NavigationSummary } from 'api';

const NOTHING: NavigationSummary = {
  unreadConversationCount: 0,
  unreadNotificationCount: 0,
  newRequestCount: 0,
  ownsListing: false,
  isVerifier: false,
  verificationCount: 0,
};

/**
 * The signed-in member's navigation summary. A failed load leaves the counts at zero: the
 * chrome must never stand in the way of the page.
 */
@Injectable({ providedIn: 'root' })
export class NavigationStore {
  private readonly api = inject(NAVIGATION_API);
  private readonly current = signal<NavigationSummary>(NOTHING);

  readonly summary = this.current.asReadonly();

  /** Takes the counts the event stream sends (L2-065 AC4). */
  apply(summary: NavigationSummary): void {
    this.current.set(summary);
  }

  load(): void {
    this.api.getSummary().subscribe({
      next: (summary) => this.current.set(summary),
      error: () => this.current.set(NOTHING),
    });
  }
}
