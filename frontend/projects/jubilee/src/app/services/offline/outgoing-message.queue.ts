import { Injectable, signal } from '@angular/core';
import { inStore, openDatabase } from './idb';
import { timings } from './timings';

/** A message written offline that waits on the device (L2-120). */
export interface QueuedMessage {
  /** Increases with each message; it fixes the order they are sent in. */
  sequence: number;
  conversationId: string;
  body: string;
  idempotencyKey: string;
  /** When it was written or last retried, as an ISO time. */
  queuedAt: string;
  /** "Waiting to send" or "Not sent". */
  state: 'waiting' | 'not-sent';
}

const STORE = 'messages';

/**
 * OutgoingMessageQueue: the messages written offline, kept in the `jubilee-outbox` database.
 * `items` is every queued message in sending order; it is read once at the start and then follows
 * each change, so a page shows the queue without asking the database.
 */
@Injectable({ providedIn: 'root' })
export class OutgoingMessageQueue {
  private db?: Promise<IDBDatabase>;
  private readonly all = signal<QueuedMessage[]>([]);
  readonly items = this.all.asReadonly();
  /** Resolves when the saved queue has been read. */
  readonly ready: Promise<void>;

  constructor() {
    this.ready = this.refresh();
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= openDatabase('jubilee-outbox', 1, (db) =>
      db.createObjectStore(STORE, { keyPath: 'sequence', autoIncrement: true }),
    );
    return this.db;
  }

  private async refresh(): Promise<void> {
    try {
      const db = await this.open();
      const list = ((await inStore(db, STORE, 'readonly', (store) => store.getAll())) ??
        []) as QueuedMessage[];
      this.all.set(list.sort((a, b) => a.sequence - b.sequence));
    } catch {
      this.all.set([]);
    }
  }

  async enqueue(
    conversationId: string,
    body: string,
    idempotencyKey: string,
    now = new Date(),
  ): Promise<void> {
    const db = await this.open();
    const message = {
      conversationId,
      body,
      idempotencyKey,
      queuedAt: now.toISOString(),
      state: 'waiting',
    };
    await inStore(db, STORE, 'readwrite', (store) => store.add(message));
    await this.refresh();
  }

  /** The message that is next to be sent: the first one still waiting. */
  nextWaiting(): QueuedMessage | undefined {
    return this.all().find((message) => message.state === 'waiting');
  }

  async markSent(message: QueuedMessage): Promise<void> {
    await this.remove(message);
  }

  async markNotSent(message: QueuedMessage): Promise<void> {
    await this.update(message, { state: 'not-sent' });
  }

  /** "Try again": the message waits again, with the same key and a fresh time (L2-120 AC3). */
  async retry(message: QueuedMessage, now = new Date()): Promise<void> {
    await this.update(message, { state: 'waiting', queuedAt: now.toISOString() });
  }

  async remove(message: QueuedMessage): Promise<void> {
    const db = await this.open();
    await inStore(db, STORE, 'readwrite', (store) => store.delete(message.sequence));
    await this.refresh();
  }

  /** Marks the messages that waited longer than a day as "Not sent"; returns how many changed. */
  async expire(now = new Date()): Promise<number> {
    const limit = timings().queueLifetime;
    const late = this.all().filter(
      (message) =>
        message.state === 'waiting' && now.getTime() - Date.parse(message.queuedAt) > limit,
    );
    for (const message of late) await this.update(message, { state: 'not-sent' });
    return late.length;
  }

  /** Forgets the queue; called when the member signs out. */
  async clear(): Promise<void> {
    const db = await this.open();
    await inStore(db, STORE, 'readwrite', (store) => store.clear());
    await this.refresh();
  }

  private async update(message: QueuedMessage, change: Partial<QueuedMessage>): Promise<void> {
    const db = await this.open();
    await inStore(db, STORE, 'readwrite', (store) => store.put({ ...message, ...change }));
    await this.refresh();
  }
}
