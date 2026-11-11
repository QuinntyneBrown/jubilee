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

/** The stream as server-sent events: the browser reconnects and sends `Last-Event-ID` itself. */
@Injectable()
export class SseEventsApi implements EventsApi {
  stream(): Observable<MemberEvent> {
    return new Observable<MemberEvent>((subscriber) => {
      const source = new EventSource('/api/events', { withCredentials: true });
      source.addEventListener('notification', (event) => {
        const message = event as MessageEvent<string>;
        subscriber.next({
          type: 'notification',
          id: message.lastEventId,
          item: JSON.parse(message.data) as NotificationItem,
        });
      });
      source.addEventListener('counts', (event) => {
        subscriber.next({
          type: 'counts',
          counts: JSON.parse((event as MessageEvent<string>).data) as NavigationSummary,
        });
      });
      return () => source.close();
    });
  }
}
