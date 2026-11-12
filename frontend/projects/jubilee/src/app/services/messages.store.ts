import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Inbox, MESSAGES_API } from 'api';
import { LoadState, errorReference } from 'api';
import { ConnectionService } from './offline/connection.service';
import { OfflineNavigation } from './offline/offline-navigation';

/** The member's inbox, shared by the Messages page and the list beside an open conversation. */
@Injectable({ providedIn: 'root' })
export class MessagesStore {
  private readonly api = inject(MESSAGES_API);
  private readonly router = inject(Router);
  private readonly connection = inject(ConnectionService);
  private readonly offlinePage = inject(OfflineNavigation);
  private readonly current = signal<LoadState<Inbox>>({ status: 'loading' });
  private readonly term = signal('');
  private requests = 0;

  readonly state = this.current.asReadonly();
  readonly search = this.term.asReadonly();

  /** Loads the inbox; a search term filters it (L2-059). */
  load(search: string = this.term()): void {
    const request = ++this.requests;
    this.term.set(search);
    if (this.current().status === 'error') this.current.set({ status: 'loading' });
    this.api.inbox(search || undefined).subscribe({
      next: (inbox) => {
        if (request === this.requests) this.current.set({ status: 'loaded', value: inbox });
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
}
