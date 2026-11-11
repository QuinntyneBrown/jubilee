import type { Page, Route } from '@playwright/test';

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

/** Resolves once the app has saved `key` on the device (the snapshot is written after the page shows). */
export async function waitForSnapshot(page: Page, key: string): Promise<void> {
  await page.waitForFunction(
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
  );
}
