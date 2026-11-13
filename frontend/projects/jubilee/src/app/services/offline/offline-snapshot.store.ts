import { Injectable } from '@angular/core';
import { inStore, openDatabase } from './idb';

/** What was last received from the network for one resource, and when (L2-119). */
export interface Snapshot<T> {
  key: string;
  savedAt: string;
  /** When it was last saved, for keeping the most recently opened conversations. */
  touchedAt: number;
  data: T;
}

/** How many opened conversations stay readable offline (L2-119 AC3). */
export const KEPT_CONVERSATIONS = 20;

const STORE = 'snapshots';

/**
 * OfflineSnapshotStore: the browse home and the last twenty opened conversations, kept in the
 * `jubilee-offline` database each time they arrive from the network, so they can be shown when
 * the device is offline. A failure to read or write is never the member's problem: the page then
 * simply has nothing saved.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSnapshotStore {
  private db?: Promise<IDBDatabase>;

  private open(): Promise<IDBDatabase> {
    this.db ??= openDatabase('jubilee-offline', 1, (db) =>
      db.createObjectStore(STORE, { keyPath: 'key' }),
    );
    return this.db;
  }

  async save<T>(key: string, data: T, now: Date = new Date()): Promise<void> {
    try {
      const db = await this.open();
      const snapshot: Snapshot<T> = {
        key,
        savedAt: now.toISOString(),
        touchedAt: now.getTime(),
        data,
      };
      await inStore(db, STORE, 'readwrite', (store) => store.put(snapshot));
      if (key.startsWith('conversation:')) await this.keepLastConversations(db);
    } catch {
      // Nothing could be saved; the page works as it did.
    }
  }

  async read<T>(key: string): Promise<Snapshot<T> | null> {
    try {
      const db = await this.open();
      const found = await inStore(db, STORE, 'readonly', (store) => store.get(key));
      return (found as Snapshot<T> | undefined) ?? null;
    } catch {
      return null;
    }
  }

  /** Forgets one saved copy. */
  async remove(key: string): Promise<void> {
    try {
      const db = await this.open();
      await inStore(db, STORE, 'readwrite', (store) => store.delete(key));
    } catch {
      // Nothing to forget.
    }
  }

  /** Forgets every saved page; called when the member signs out so personal data does not stay. */
  async clear(): Promise<void> {
    try {
      const db = await this.open();
      await inStore(db, STORE, 'readwrite', (store) => store.clear());
    } catch {
      // Nothing to clear.
    }
  }

  private async keepLastConversations(db: IDBDatabase): Promise<void> {
    const all = ((await inStore(db, STORE, 'readonly', (store) => store.getAll())) ??
      []) as Snapshot<unknown>[];
    const conversations = all
      .filter((snapshot) => snapshot.key.startsWith('conversation:'))
      .sort((a, b) => b.touchedAt - a.touchedAt);
    for (const old of conversations.slice(KEPT_CONVERSATIONS)) {
      await inStore(db, STORE, 'readwrite', (store) => store.delete(old.key));
    }
  }
}
