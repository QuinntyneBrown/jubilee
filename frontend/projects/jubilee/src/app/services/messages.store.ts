import { Injectable, inject, signal } from '@angular/core';
import { Inbox, MESSAGES_API } from 'api';
import { LoadState, errorReference } from './load-state';

/** The member's inbox, shared by the Messages page and the list beside an open conversation. */
@Injectable({ providedIn: 'root' })
export class MessagesStore {
  private readonly api = inject(MESSAGES_API);
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
          this.current.set({ status: 'error', reference: errorReference(error, 'JB-MSG-503') });
        }
      },
    });
  }
}
