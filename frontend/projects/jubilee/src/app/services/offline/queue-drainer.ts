import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { MESSAGES_API } from 'api';
import { firstValueFrom } from 'rxjs';
import { ConnectionService } from './connection.service';
import { OutgoingMessageQueue } from './outgoing-message.queue';
import { timings } from './timings';

const LOCK = 'jubilee-outbox-drain';

/**
 * QueueDrainer (L2-120): sends the messages kept on the device, oldest first, each with the key it
 * was written with so a repeat can never double it. It runs when the app starts and each time the
 * connection comes back. One tab drains at a time (a Web Lock). A message the server refuses becomes
 * "Not sent"; a message that cannot be delivered stays "Waiting to send" and ends the run.
 */
@Injectable({ providedIn: 'root' })
export class QueueDrainer {
  private readonly queue = inject(OutgoingMessageQueue);
  private readonly connection = inject(ConnectionService);
  private readonly api = inject(MESSAGES_API);
  private started = false;
  /** Counts the messages delivered from the queue, so an open conversation can show them. */
  readonly delivered = signal(0);

  constructor() {
    // The service worker sent the queue (Background Sync, ADR 0068): show what it did.
    navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as { type?: string; count?: number } | null;
      if (data?.type === 'jubilee-outbox-sent') void this.sentByTheWorker(data.count ?? 0);
    });
    let seen = this.connection.returned();
    effect(() => {
      const now = this.connection.returned();
      if (now !== seen) {
        seen = now;
        void this.drain(true);
      }
    });
  }

  /** Called once by the shell: drains what was left from last time and expires what waited too long. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.queue.ready.then(() => this.drain(false));
    setInterval(() => void this.queue.expire(), timings().expiryEvery);
  }

  private async sentByTheWorker(count: number): Promise<void> {
    await this.queue.reload();
    if (count > 0) {
      this.delivered.update((n) => n + count);
      this.connection.announceSent(count);
    }
  }

  async drain(announce: boolean): Promise<void> {
    await this.queue.ready;
    await this.queue.expire();
    if (this.connection.cannotDeliver()) return;
    const run = async () => {
      // The service worker may have sent some while this tab waited for the lock.
      await this.queue.reload();
      let sent = 0;
      for (let next = this.queue.nextWaiting(); next; next = this.queue.nextWaiting()) {
        try {
          await firstValueFrom(this.api.send(next.conversationId, next.body, next.idempotencyKey));
          await this.queue.markSent(next);
          sent++;
          this.delivered.update((n) => n + 1);
        } catch (error) {
          if (refused(error)) await this.queue.markNotSent(next);
          else break;
        }
      }
      if (announce || sent > 0) this.connection.announceSent(sent);
    };
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    if (locks) await locks.request(LOCK, run);
    else await run();
  }
}

/** The server answered and said no: another try would get the same answer. */
function refused(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 429 &&
    error.status !== 408
  );
}
