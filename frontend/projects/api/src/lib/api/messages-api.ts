import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OWN_OFFLINE_FALLBACK, OWN_RETRY } from './http-context';
import { ChatMessage, Conversation, Inbox, StartedConversation } from '../models/messages';

/** Contract of the messaging endpoints (L2-055 to L2-063). */
export interface MessagesApi {
  inbox(search?: string): Observable<Inbox>;
  open(id: string, before?: string): Observable<Conversation>;
  start(listingSlug: string, body: string, idempotencyKey: string): Observable<StartedConversation>;
  send(id: string, body: string, idempotencyKey: string): Observable<ChatMessage>;
}

export const MESSAGES_API = new InjectionToken<MessagesApi>('MESSAGES_API');

@Injectable()
export class HttpMessagesApi implements MessagesApi {
  private readonly http = inject(HttpClient);

  inbox(search?: string): Observable<Inbox> {
    const params = search ? new HttpParams().set('q', search) : undefined;
    // The inbox is also the list beside an open conversation, so its store decides about the offline page.
    return this.http.get<Inbox>('/api/conversations', {
      params,
      context: new HttpContext().set(OWN_OFFLINE_FALLBACK, true),
    });
  }

  open(id: string, before?: string): Observable<Conversation> {
    const params = before ? new HttpParams().set('before', before) : undefined;
    return this.http.get<Conversation>(`/api/conversations/${id}`, {
      params,
      context: new HttpContext().set(OWN_OFFLINE_FALLBACK, !before),
    });
  }

  start(
    listingSlug: string,
    body: string,
    idempotencyKey: string,
  ): Observable<StartedConversation> {
    return this.http.post<StartedConversation>('/api/conversations', {
      listingSlug,
      body,
      idempotencyKey,
    });
  }

  send(id: string, body: string, idempotencyKey: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `/api/conversations/${id}/messages`,
      { body, idempotencyKey },
      // A message that cannot be sent goes to the outgoing queue, which is its way of trying again.
      { context: new HttpContext().set(OWN_RETRY, true) },
    );
  }
}
