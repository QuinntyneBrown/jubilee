import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EVENTS_API, NOTIFICATIONS_API, NotificationItem, NotificationKind } from 'api';
import { Subscription } from 'rxjs';
import { NavigationStore } from './navigation.store';
import { SessionService } from './session.service';
import { ToastService } from '../toasts/toast.service';

const OPEN: Record<NotificationKind, string> = {
  message: 'Open conversation',
  request: 'View request',
  reminder: 'View details',
  listing: 'Open My business',
  account: 'View account',
  business: 'View business',
};

/**
 * The member's open connection (L2-070): each notification that arrives becomes a toast, the badge counts
 * follow, and a page that lists notifications is told to read them again. A notification is shown once even
 * when the connection drops and the server sends it again after the reconnect.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly events = inject(EVENTS_API);
  private readonly notifications = inject(NOTIFICATIONS_API);
  private readonly navigation = inject(NavigationStore);
  private readonly session = inject(SessionService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  private subscription: Subscription | null = null;
  private readonly seen = new Set<string>();
  private readonly arrived = signal(0);

  /** Grows with each notification that arrives, so a list on screen can read again. */
  readonly arrivals = this.arrived.asReadonly();

  start(): void {
    if (this.subscription) return;
    this.subscription = this.events.stream().subscribe((event) => {
      if (event.type === 'counts') {
        this.navigation.apply(event.counts);
        return;
      }
      if (this.seen.has(event.id)) return;
      this.seen.add(event.id);
      this.arrived.update((count) => count + 1);
      this.announce(event.item);
    });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  private announce(item: NotificationItem): void {
    if (item.kind === 'account') this.session.resolve().subscribe();
    this.toasts.show({
      tone: 'info',
      title: item.title,
      text: item.detail || undefined,
      action: {
        label: OPEN[item.kind] ?? 'Open',
        run: () => {
          this.notifications.markRead(item.id).subscribe({
            next: (count) =>
              this.navigation.apply({
                ...this.navigation.summary(),
                unreadNotificationCount: count.unread,
              }),
            error: () => undefined,
          });
          void this.router.navigateByUrl(item.target);
        },
      },
    });
  }
}
