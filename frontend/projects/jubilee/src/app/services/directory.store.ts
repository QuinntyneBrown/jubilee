import { Injectable, inject, signal } from '@angular/core';
import { BrowseHome, DIRECTORY_API } from 'api';
import { LoadState, errorReference } from './load-state';

/** DirectoryStore: the browse home directory and its load state. Provided by the page. */
@Injectable()
export class DirectoryStore {
  private readonly api = inject(DIRECTORY_API);
  private readonly current = signal<LoadState<BrowseHome>>({ status: 'loading' });

  readonly state = this.current.asReadonly();

  /** Loads the directory; "Try again" calls it again and reloads this region only. */
  load(): void {
    this.current.set({ status: 'loading' });
    this.api.getHome().subscribe({
      next: (value) => this.current.set({ status: 'loaded', value }),
      error: (error: unknown) =>
        this.current.set({ status: 'error', reference: errorReference(error, 'JB-DIR-503') }),
    });
  }
}
