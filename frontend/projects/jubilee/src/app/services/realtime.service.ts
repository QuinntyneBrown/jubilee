import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EVENTS_API, NOTIFICATIONS_API, NotificationItem, NotificationKind } from 'api';
import { Subject, Subscription } from 'rxjs';
import { NavigationStore } from './navigation.store';
import { SessionService } from './session.service';
import { ToastService } from 'components';

/** Where the owner answers requests; a notification about a request of theirs opens it. */
const INCOMING = '/my-business/requests';

/** The member's requests; a notification about one of them opens it. */
const MY_REQUESTS = '/requests';

const OPEN: Record<NotificationKind, string> = {
  message: 'Open conversation',
  request: 'View request',
  reminder: 'View details',
  listing: 'Open My business',
  account: 'View account',
  business: 'View business',
  product: 'View in shop',
  review: 'View reviews',
};

/** Whether the page at `here` announces a request notification with this target itself. */
function saysItself(here: string, target: string): boolean {
  if (here === INCOMING) return target === INCOMING;
  if (here === MY_REQUESTS) return target.startsWith(`${MY_REQUESTS}/`);
  return here.startsWith(`${MY_REQUESTS}/`) && here === target;
}

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
  private readonly up = signal(true);

  /**
   * Whether the stream is up; false from the moment an attempt to connect fails until one opens. A
   * page that must not miss an event asks on a timer while it is false (L2-051 AC7; ADR 0050).
   */
  readonly connected = this.up.asReadonly();

  /** Grows with each notification that arrives, so a list on screen can read again. */
  readonly arrivals = this.arrived.asReadonly();

  private readonly items = new Subject<NotificationItem>();
  /**
   * Each notification as it arrives, once. An open conversation and the inbox read again on the ones
   * that concern them (L2-057 AC5; ADR 0039): the stream carries no other event for a message.
   */
  readonly received = this.items.asObservable();

  start(): void {
    if (this.subscription) return;
    this.subscription = this.events.stream().subscribe((event) => {
      if (event.type === 'connection') {
        this.up.set(event.connected);
        return;
      }
      if (event.type === 'counts') {
        this.navigation.apply(event.counts);
        return;
      }
      if (this.seen.has(event.id)) return;
      this.seen.add(event.id);
      this.arrived.update((count) => count + 1);
      this.items.next(event.item);
      // A message in the conversation that is open is read where it lands, not in a toast.
      const here = this.router.url.split('?')[0];
      if (event.item.kind === 'message' && here === event.item.target) return;
      // The owner's requests page says a new request in its own words (L2-051 AC5), and a member's
      // request page says a change of status in its own (L2-070 AC6).
      if (event.item.kind === 'request' && saysItself(here, event.item.target)) return;
      this.announce(event.item);
    });
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.up.set(true);
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
