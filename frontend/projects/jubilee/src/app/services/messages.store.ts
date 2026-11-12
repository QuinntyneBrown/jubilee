import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { Inbox, InboxRow, MESSAGES_API } from 'api';
import { LoadState, errorReference } from 'api';
import { ConnectionService } from './offline/connection.service';
import { OfflineNavigation } from './offline/offline-navigation';

/** What "Show more conversations" did: how many rows it added, or that it could not. */
export type MoreResult = { added: number; first: string | null } | 'failed';

/**
 * The member's inbox, shared by the Messages page and the list beside an open conversation. The
 * API answers 50 conversations at a time (L2-056 AC7); the rows a member has loaded stay listed
 * while the first page is read again.
 */
@Injectable({ providedIn: 'root' })
export class MessagesStore {
  private readonly api = inject(MESSAGES_API);
  private readonly router = inject(Router);
  private readonly connection = inject(ConnectionService);
  private readonly offlinePage = inject(OfflineNavigation);
  private readonly current = signal<LoadState<Inbox>>({ status: 'loading' });
  private readonly term = signal('');
  private readonly more = signal(false);
  private readonly moreResults = new Subject<MoreResult>();
  private requests = 0;

  readonly state = this.current.asReadonly();
  readonly search = this.term.asReadonly();
  /** True while the next conversations are being read. */
  readonly loadingMore = this.more.asReadonly();
  /** Each answer to "Show more conversations". */
  readonly moreLoaded: Observable<MoreResult> = this.moreResults.asObservable();

  /** True while the inbox, or the search, holds more conversations than are listed. */
  readonly hasMore = computed(() => {
    const inbox = this.current();
    return inbox.status === 'loaded' && inbox.value.conversations.length < inbox.value.totalCount;
  });

  /** Loads the inbox; a search term filters it (L2-059). */
  load(search: string = this.term()): void {
    const request = ++this.requests;
    const sameList = search === this.term();
    this.term.set(search);
    this.more.set(false);
    if (this.current().status === 'error') this.current.set({ status: 'loading' });
    this.api.inbox(search || undefined).subscribe({
      next: (inbox) => {
        if (request !== this.requests) return;
        const shown = this.current();
        // The same list read again: the rows loaded below its first page stay where they are.
        const below =
          sameList && shown.status === 'loaded'
            ? withoutRows(shown.value.conversations, inbox.conversations)
            : [];
        this.current.set({
          status: 'loaded',
          value: { ...inbox, conversations: [...inbox.conversations, ...below] },
        });
      },
      error: (error: unknown) => {
        if (request === this.requests) {
          // The Messages page itself cannot load offline; beside a conversation the list just errors.
          const offline = error instanceof HttpErrorResponse && error.status === 0;
          if (
            offline &&
            this.connection.isOffline() &&
            this.router.url.split('?')[0] === '/messages'
          ) {
            this.offlinePage.show();
          }
          this.current.set({ status: 'error', reference: errorReference(error, 'JB-MSG-503') });
        }
      },
    });
  }

  /** Adds the conversations after the ones listed, below them (L2-056 AC7). */
  loadMore(): void {
    const shown = this.current();
    if (shown.status !== 'loaded' || this.more() || !this.hasMore()) return;
    const request = this.requests;
    this.more.set(true);
    this.api.inbox(this.term() || undefined, shown.value.conversations.length).subscribe({
      next: (page) => {
        // The list was read again meanwhile: its answer stands, and the button can be pressed again.
        if (request !== this.requests) return;
        const listed = this.current();
        if (listed.status !== 'loaded') return;
        const added = withoutRows(page.conversations, listed.value.conversations);
        this.current.set({
          status: 'loaded',
          value: { ...page, conversations: [...listed.value.conversations, ...added] },
        });
        this.more.set(false);
        this.moreResults.next({ added: added.length, first: added[0]?.id ?? null });
      },
      error: () => {
        if (request !== this.requests) return;
        this.more.set(false);
        this.moreResults.next('failed');
      },
    });
  }
}

/** `rows` without the conversations that `listed` already holds: a row is never shown twice. */
function withoutRows(rows: InboxRow[], listed: InboxRow[]): InboxRow[] {
  const known = new Set(listed.map((row) => row.id));
  return rows.filter((row) => !known.has(row.id));
}
