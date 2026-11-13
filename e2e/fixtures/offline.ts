import { expect, type BrowserContext, type Page, type Route } from '@playwright/test';

// Stand-ins for the network the offline behaviour reacts to (L2-119 to L2-122, ADR 0009). The device
// loses and regains its connection at the page's edge: the browser's own `offline` and `online`
// events fire and every /api request fails, as it would with no network. Nothing reaches the API.

const cut = (route: Route) => route.abort('internetdisconnected');
const down = (route: Route) => route.fulfill({ status: 503 });

/** The device loses its network: requests to Jubilee fail and the browser says it is offline. */
export async function goOffline(page: Page): Promise<void> {
  await page.route('**/api/**', cut);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
  });
}

/**
 * The network returns. `ping` is how Jubilee answers the app's check: "up" (the recorded 204),
 * or "down" (503, Jubilee cannot be reached).
 */
export async function goOnline(page: Page, ping: 'up' | 'down' = 'up'): Promise<void> {
  await page.unroute('**/api/**', cut);
  if (ping === 'down') await page.route('**/api/**', down);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    window.dispatchEvent(new Event('online'));
  });
}

/** Jubilee answers again after an outage. */
export async function restoreJubilee(page: Page): Promise<void> {
  await page.unroute('**/api/**', down);
}

/**
 * Resolves once the app has saved `key` on the device (the snapshot is written after the page shows).
 * Polled from here: `waitForFunction` does not wait for a promise its function returns.
 */
export async function waitForSnapshot(page: Page, key: string): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        (wanted) =>
          new Promise<boolean>((resolve) => {
            const open = indexedDB.open('jubilee-offline', 1);
            open.onerror = () => resolve(false);
            open.onupgradeneeded = () => resolve(false);
            open.onsuccess = () => {
              const db = open.result;
              if (!db.objectStoreNames.contains('snapshots')) return resolve(false);
              const get = db.transaction('snapshots').objectStore('snapshots').get(wanted);
              get.onsuccess = () => resolve(get.result !== undefined);
              get.onerror = () => resolve(false);
            };
          }),
        key,
      ),
    )
    .toBe(true);
}

/** Where the production build of the app, with its service worker, is served (ADR 0068). */
export const INSTALLED_APP_URL = 'http://localhost:4203';

/**
 * Resolves once the service worker is active and holds every file of the app shell, so the app can
 * open with no connection (L2-119 AC3).
 */
export async function waitForAppShell(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker?.getRegistration();
          if (!registration?.active) return false;
          const manifest = (await (await fetch('/ngsw.json', { cache: 'no-store' })).json()) as {
            assetGroups: { name: string; urls: string[] }[];
          };
          const shell = manifest.assetGroups.find((group) => group.name === 'app')?.urls ?? [];
          for (const url of shell) if (!(await caches.match(url))) return false;
          return shell.length > 0;
        }),
      { timeout: 60_000 },
    )
    .toBe(true);
}

/**
 * The whole device loses its network, the service worker included, as on a phone in a tunnel.
 * The page's own requests to Jubilee are cut as `goOffline` cuts them.
 */
export async function deviceOffline(page: Page): Promise<void> {
  await page.route('**/api/**', cut);
  await page.context().setOffline(true);
}

/** What is left on the device: the saved pages and the messages in the outgoing queue. */
export async function savedOnDevice(page: Page): Promise<{ pages: number; queued: number }> {
  return page.evaluate(async () => {
    const count = (name: string, store: string) =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open(name);
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(store)) {
            db.close();
            return resolve(0);
          }
          const counted = db.transaction(store).objectStore(store).count();
          counted.onsuccess = () => {
            db.close();
            resolve(counted.result);
          };
          counted.onerror = () => resolve(0);
        };
      });
    return {
      pages: await count('jubilee-offline', 'snapshots'),
      queued: await count('jubilee-outbox', 'messages'),
    };
  });
}

/** A message the service worker sent, as the API received it. */
export interface WorkerSend {
  conversationId: string;
  body: string;
  idempotencyKey: string;
}

/**
 * Answers the messages the service worker sends (ADR 0009): its requests are seen by the browser
 * context, not by the page. Each send is answered 201 and kept.
 */
export async function answerWorkerSends(context: BrowserContext): Promise<WorkerSend[]> {
  const sends: WorkerSend[] = [];
  await context.route('**/api/conversations/*/messages', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const conversationId = new URL(route.request().url()).pathname.split('/')[3];
    const { body, idempotencyKey } = route.request().postDataJSON() as WorkerSend;
    sends.push({ conversationId, body, idempotencyKey });
    await route.fulfill({
      status: 201,
      json: {
        id: `m-sync-${sends.length}`,
        body,
        mine: true,
        sentAt: '2026-11-11T14:00:00Z',
        state: 'sent',
      },
    });
  });
  return sends;
}

/**
 * The browser fires the Background Sync of the outgoing queue (L2-120 AC5), as it does when the
 * connection returns: through the DevTools protocol, since a test cannot change the real network.
 */
export async function fireOutboxSync(context: BrowserContext, page: Page, origin: string) {
  const cdp = await context.newCDPSession(page);
  const registrationId = new Promise<string>((resolve) => {
    cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
      const found = registrations.find(
        (registration) => registration.scopeURL === `${origin}/` && !registration.isDeleted,
      );
      if (found) resolve(found.registrationId);
    });
  });
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.dispatchSyncEvent', {
    origin,
    registrationId: await registrationId,
    tag: 'jubilee-outbox',
    lastChance: false,
  });
}

/** The device finds its network again, after `deviceOffline`. */
export async function deviceOnline(page: Page): Promise<void> {
  await page.unroute('**/api/**', cut);
  await page.context().setOffline(false);
}

/** Keeps a page on the device as the app does when a member opens it (ADR 0032): `key` in the saved pages. */
export async function keepOnDevice(page: Page, key: string, data: unknown): Promise<void> {
  await page.evaluate(
    ({ key, data }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('jubilee-offline', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const now = new Date();
          const put = db
            .transaction('snapshots', 'readwrite')
            .objectStore('snapshots')
            .put({ key, savedAt: now.toISOString(), touchedAt: now.getTime(), data });
          put.onsuccess = () => {
            db.close();
            resolve();
          };
          put.onerror = () => reject(put.error);
        };
      }),
    { key, data },
  );
}
