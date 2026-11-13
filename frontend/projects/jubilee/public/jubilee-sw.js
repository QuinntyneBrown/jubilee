/*
 * Jubilee's service worker (ADR 0068). It is the Angular service worker, which keeps the app shell
 * so Jubilee opens with no connection, with two additions:
 *
 * - a request to /api is never answered by the worker. It goes to the network as if there were no
 *   worker, so no answer of the API is kept in a cache, and what a member saw stays in IndexedDB,
 *   where signing out clears it (ADR 0032);
 * - Background Sync (L2-120 AC5): when the browser says the connection is back, the messages
 *   waiting in the outgoing queue are sent, even while Jubilee is closed. It does what the app's
 *   QueueDrainer does, under the same lock, so a message is never sent twice.
 */
self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).pathname.startsWith('/api/')) event.stopImmediatePropagation();
});

importScripts('./ngsw-worker.js');

/** The tag the app asks for, the database of the queue, and the lock one sender holds at a time. */
const OUTBOX = 'jubilee-outbox';
const LOCK = 'jubilee-outbox-drain';
/** A message that waited longer than a day is "Not sent" (L2-120 AC3). */
const LIFETIME = 24 * 60 * 60 * 1000;

self.addEventListener('sync', (event) => {
  if (event.tag === OUTBOX) event.waitUntil(sendTheQueue());
});

function settled(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openOutbox() {
  const opening = indexedDB.open(OUTBOX, 1);
  opening.onupgradeneeded = () =>
    opening.result.createObjectStore('messages', { keyPath: 'sequence', autoIncrement: true });
  return settled(opening);
}

async function inStore(db, mode, work) {
  const transaction = db.transaction('messages', mode);
  const result = settled(work(transaction.objectStore('messages')));
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return result;
}

/** The server answered and said no: another try would get the same answer. */
function refused(status) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/**
 * Sends the waiting messages oldest first, each with the key it was written with. A message the
 * server refuses, or one that waited too long, becomes "Not sent"; the first one that cannot be
 * delivered ends the run, and the sync fails so the browser tries it again later. Open pages are
 * told how many were sent.
 */
async function sendTheQueue() {
  const run = async () => {
    const db = await openOutbox();
    let sent = 0;
    let undelivered = false;
    try {
      const queue = await inStore(db, 'readonly', (store) => store.getAll());
      queue.sort((a, b) => a.sequence - b.sequence);
      for (const message of queue) {
        if (message.state !== 'waiting') continue;
        if (Date.now() - Date.parse(message.queuedAt) > LIFETIME) {
          await inStore(db, 'readwrite', (store) => store.put({ ...message, state: 'not-sent' }));
          continue;
        }
        let answer;
        try {
          answer = await fetch(`/api/conversations/${message.conversationId}/messages`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: message.body, idempotencyKey: message.idempotencyKey }),
          });
        } catch {
          undelivered = true;
          break;
        }
        if (answer.ok) {
          await inStore(db, 'readwrite', (store) => store.delete(message.sequence));
          sent++;
        } else if (refused(answer.status)) {
          await inStore(db, 'readwrite', (store) => store.put({ ...message, state: 'not-sent' }));
        } else {
          undelivered = true;
          break;
        }
      }
    } finally {
      db.close();
    }
    const pages = await self.clients.matchAll({ type: 'window' });
    for (const page of pages) page.postMessage({ type: 'jubilee-outbox-sent', count: sent });
    if (undelivered) throw new Error('Jubilee could not be reached; the browser will try again.');
  };
  return self.navigator.locks ? self.navigator.locks.request(LOCK, run) : run();
}
