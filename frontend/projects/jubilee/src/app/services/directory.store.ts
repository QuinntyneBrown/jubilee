import { Injectable, inject, signal } from '@angular/core';
import { BrowseHome, DIRECTORY_API } from 'api';
import { ListingKindHints } from './listing-kind-hints';
import { LoadState, errorReference } from './load-state';

/** DirectoryStore: the browse home directory and its load state. Provided by the page. */
@Injectable()
export class DirectoryStore {
  private readonly api = inject(DIRECTORY_API);
  private readonly hints = inject(ListingKindHints);
  private readonly current = signal<LoadState<BrowseHome>>({ status: 'loading' });

  readonly state = this.current.asReadonly();

  /** Loads the directory; "Try again" calls it again and reloads this region only. */
  load(): void {
    this.current.set({ status: 'loading' });
    this.api.getHome().subscribe({
      next: (value) => {
        for (const business of value.featured) {
          this.hints.rememberCategory([business], business.categorySlug);
        }
        for (const group of value.groups) this.hints.rememberCategory(group.businesses, group.slug);
        this.current.set({ status: 'loaded', value });
      },
      error: (error: unknown) =>
        this.current.set({ status: 'error', reference: errorReference(error, 'JB-DIR-503') }),
    });
  }
}
