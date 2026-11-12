import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OWN_OFFLINE_FALLBACK, OWN_RETRY } from './http-context';
import {
  AttachmentLink,
  ChatMessage,
  Conversation,
  Inbox,
  StartedConversation,
  StoredAttachment,
} from '../models/messages';

/** Contract of the messaging endpoints (L2-055 to L2-063). */
export interface MessagesApi {
  /** The 50 conversations after the first `skip`, newest first, with the counts of them all (L2-056 AC7). */
  inbox(search?: string, skip?: number): Observable<Inbox>;
  open(id: string, before?: string): Observable<Conversation>;
  start(listingSlug: string, body: string, idempotencyKey: string): Observable<StartedConversation>;
  send(
    id: string,
    body: string,
    idempotencyKey: string,
    attachmentId?: string,
  ): Observable<ChatMessage>;
  /** Stores a photo for a conversation; the next send names it (L2-060). */
  attach(id: string, photo: Blob): Observable<StoredAttachment>;
  /** A new five-minute link to a photo of a conversation (L2-060 AC8). */
  attachmentLink(id: string, attachmentId: string): Observable<AttachmentLink>;
  /** Stops, or resumes, the e-mails about new replies in a conversation (L2-061). */
  mute(id: string, muted: boolean): Observable<void>;
  /** Reports a conversation to the verification team; a member may block the business with it (L2-063). */
  report(id: string, reason: string, block: boolean): Observable<void>;
}

export const MESSAGES_API = new InjectionToken<MessagesApi>('MESSAGES_API');

@Injectable()
export class HttpMessagesApi implements MessagesApi {
  private readonly http = inject(HttpClient);

  inbox(search?: string, skip?: number): Observable<Inbox> {
    let params = new HttpParams();
    if (search) params = params.set('q', search);
    if (skip) params = params.set('skip', skip);
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

  send(
    id: string,
    body: string,
    idempotencyKey: string,
    attachmentId?: string,
  ): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `/api/conversations/${id}/messages`,
      attachmentId ? { body, idempotencyKey, attachmentId } : { body, idempotencyKey },
      // A message that cannot be sent goes to the outgoing queue, which is its way of trying again.
      { context: new HttpContext().set(OWN_RETRY, true) },
    );
  }

  attach(id: string, photo: Blob): Observable<StoredAttachment> {
    const form = new FormData();
    form.append('file', photo, photo.type === 'image/png' ? 'photo.png' : 'photo.jpg');
    return this.http.post<StoredAttachment>(`/api/conversations/${id}/attachments`, form, {
      context: new HttpContext().set(OWN_RETRY, true),
    });
  }

  attachmentLink(id: string, attachmentId: string): Observable<AttachmentLink> {
    return this.http.get<AttachmentLink>(`/api/conversations/${id}/attachments/${attachmentId}`, {
      context: new HttpContext().set(OWN_OFFLINE_FALLBACK, true),
    });
  }

  mute(id: string, muted: boolean): Observable<void> {
    return this.http.put<void>(`/api/conversations/${id}/mute`, { muted });
  }

  report(id: string, reason: string, block: boolean): Observable<void> {
    return this.http.post<void>(`/api/conversations/${id}/report`, { reason, block });
  }
}
