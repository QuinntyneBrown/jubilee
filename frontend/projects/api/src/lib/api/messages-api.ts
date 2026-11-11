import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
    return this.http.get<Inbox>('/api/conversations', { params });
  }

  open(id: string, before?: string): Observable<Conversation> {
    const params = before ? new HttpParams().set('before', before) : undefined;
    return this.http.get<Conversation>(`/api/conversations/${id}`, { params });
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
    return this.http.post<ChatMessage>(`/api/conversations/${id}/messages`, {
      body,
      idempotencyKey,
    });
  }
}
