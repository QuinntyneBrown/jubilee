import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { BrowseHome, DIRECTORY_API } from 'api';
import { ListingHints } from './listing-hints';
import { LoadState, errorReference } from 'api';
import { ConnectionService } from './offline/connection.service';
import { OfflineNavigation } from './offline/offline-navigation';
import { OfflineSnapshotStore } from './offline/offline-snapshot.store';

/** The key the browse home is saved under for offline use. */
const SNAPSHOT_KEY = 'browse-home';

/** DirectoryStore: the browse home directory and its load state. Provided by the page. */
@Injectable()
export class DirectoryStore {
  private readonly api = inject(DIRECTORY_API);
  private readonly hints = inject(ListingHints);
  private readonly snapshots = inject(OfflineSnapshotStore);
  private readonly connection = inject(ConnectionService);
  private readonly offlinePage = inject(OfflineNavigation);
  private readonly current = signal<LoadState<BrowseHome>>({ status: 'loading' });

  readonly state = this.current.asReadonly();
  /** When the directory on show was saved, if it is the saved copy and not a fresh answer (L2-119 AC1). */
  readonly savedAt = signal<string | null>(null);

  /** Loads the directory; "Try again" calls it again and reloads this region only. */
  load(): void {
    this.current.set({ status: 'loading' });
    this.api.getHome().subscribe({
      next: (value) => {
        this.remember(value);
        this.savedAt.set(null);
        this.current.set({ status: 'loaded', value });
        void this.snapshots.save(SNAPSHOT_KEY, value);
      },
      error: (error: unknown) => void this.failed(error),
    });
  }

  /** With no network, the last directory that arrived is shown; with none saved, the offline page. */
  private async failed(error: unknown): Promise<void> {
    const noAnswer = error instanceof HttpErrorResponse && error.status === 0;
    if (noAnswer || this.connection.isOffline()) {
      const saved = await this.snapshots.read<BrowseHome>(SNAPSHOT_KEY);
      if (saved) {
        this.remember(saved.data);
        this.savedAt.set(saved.savedAt);
        this.current.set({ status: 'loaded', value: saved.data });
        return;
      }
      if (this.connection.isOffline()) {
        this.offlinePage.show();
        return;
      }
    }
    this.current.set({ status: 'error', reference: errorReference(error, 'JB-DIR-503') });
  }

  private remember(value: BrowseHome): void {
    for (const business of value.featured) {
      this.hints.rememberCategory([business], business.categorySlug);
    }
    for (const group of value.groups) this.hints.rememberCategory(group.businesses, group.slug);
    this.hints.rememberProducts(value.products);
    this.hints.rememberSpaces(value.rooms.spaces);
  }
}
