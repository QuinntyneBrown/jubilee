import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NavigationSummary } from '../models/navigation';
import {
  MemberEvent,
  NotificationItem,
  NotificationList,
  UnreadCount,
} from '../models/notifications';

/** Contract of the notification centre (L2-064). */
export interface NotificationsApi {
  list(): Observable<NotificationList>;
  markRead(id: string): Observable<UnreadCount>;
  markAllRead(): Observable<UnreadCount>;
}

export const NOTIFICATIONS_API = new InjectionToken<NotificationsApi>('NOTIFICATIONS_API');

@Injectable()
export class HttpNotificationsApi implements NotificationsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<NotificationList> {
    return this.http.get<NotificationList>('/api/notifications');
  }

  markRead(id: string): Observable<UnreadCount> {
    return this.http.post<UnreadCount>(`/api/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<UnreadCount> {
    return this.http.post<UnreadCount>('/api/notifications/read-all', {});
  }
}

/** Contract of the persistent connection that carries the member's events (L2-070). */
export interface EventsApi {
  /**
   * Opens the stream. It stays open and reconnects by itself; after a reconnect the server sends what
   * was missed. Unsubscribing closes it.
   */
  stream(): Observable<MemberEvent>;
}

export const EVENTS_API = new InjectionToken<EventsApi>('EVENTS_API');

/** How long the application waits before it opens the stream again, at first (L2-070 AC4). */
const FIRST_WAIT_MS = 5_000;

/** The longest it waits between two attempts. */
const LONGEST_WAIT_MS = 60_000;

/**
 * The stream as server-sent events: the browser reconnects and sends `Last-Event-ID` itself. A stream
 * that ends and opens again was never down; it is down when an attempt to connect fails (ADR 0050).
 *
 * The browser gives up for good when the server refuses a connection or the device was offline: the
 * source is then closed. The application opens a new one, after 5 seconds and then twice as long each
 * time up to 60, and at once when the device is online again. It names the last event it received in
 * the address, so the server sends what was missed and nothing twice (L2-070 AC4; ADR 0053).
 */
@Injectable()
export class SseEventsApi implements EventsApi {
  stream(): Observable<MemberEvent> {
    return new Observable<MemberEvent>((subscriber) => {
      let source: EventSource | null = null;
      let lastEventId = '';
      let wait = FIRST_WAIT_MS;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const open = (): void => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        source?.close();
        const current = new EventSource(
          lastEventId
            ? `/api/events?lastEventId=${encodeURIComponent(lastEventId)}`
            : '/api/events',
          { withCredentials: true },
        );
        source = current;
        let opened = false;
        current.addEventListener('open', () => {
          opened = true;
          wait = FIRST_WAIT_MS;
          subscriber.next({ type: 'connection', connected: true });
        });
        current.addEventListener('error', () => {
          if (!opened) subscriber.next({ type: 'connection', connected: false });
          opened = false;
          // While the source is connecting the browser is trying again by itself.
          if (source !== current || current.readyState !== EventSource.CLOSED) return;
          timer = setTimeout(open, wait);
          wait = Math.min(wait * 2, LONGEST_WAIT_MS);
        });
        current.addEventListener('notification', (event) => {
          const message = event as MessageEvent<string>;
          lastEventId = message.lastEventId || lastEventId;
          subscriber.next({
            type: 'notification',
            id: message.lastEventId,
            item: JSON.parse(message.data) as NotificationItem,
          });
        });
        current.addEventListener('counts', (event) => {
          subscriber.next({
            type: 'counts',
            counts: JSON.parse((event as MessageEvent<string>).data) as NavigationSummary,
          });
        });
      };

      const online = (): void => {
        if (source?.readyState !== EventSource.CLOSED) return;
        wait = FIRST_WAIT_MS;
        open();
      };
      globalThis.addEventListener('online', online);
      open();

      return () => {
        globalThis.removeEventListener('online', online);
        if (timer !== null) clearTimeout(timer);
        source?.close();
        source = null;
      };
    });
  }
}
