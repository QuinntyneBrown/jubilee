import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

/**
 * Helpers for the `shots.ts` of a journey demo film. A shot is a PNG of the running app, saved in
 * the film folder's `shots/`, which `film.js` then shows inside a browser or phone frame.
 */

/** Where the pictures go: `<film folder>/shots`. */
export const shotsDir = path.resolve(
  __dirname,
  '..',
  '..',
  process.env['JB_VIDEO_DIR'] ?? '.',
  'shots',
);

/**
 * The two layouts a film shows, for `test.use(...)`: the desktop window and the phone. Pictures are
 * taken at twice the size, so they stay sharp when the film enlarges them.
 */
export const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } as const;
export const PHONE = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 } as const;

/** Waits until the bundled faces are drawn and the page has stopped moving. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

/** Saves what the window shows as `shots/<name>.png`. */
export async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(shotsDir, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(shotsDir, `${name}.png`), animations: 'disabled' });
}

/** Saves one region, with some air around it, as `shots/<name>.png`: the close-up of a scene. */
export async function detail(region: Locator, name: string, air = 16): Promise<void> {
  mkdirSync(shotsDir, { recursive: true });
  const page = region.page();
  await region.scrollIntoViewIfNeeded();
  await settle(page);
  const box = await region.boundingBox();
  if (!box) throw new Error(`The region of "${name}" is not on the page.`);
  const view = page.viewportSize()!;
  const x = Math.max(0, box.x - air);
  const y = Math.max(0, box.y - air);
  await page.screenshot({
    path: path.join(shotsDir, `${name}.png`),
    animations: 'disabled',
    clip: {
      x,
      y,
      width: Math.min(view.width - x, box.width + air * 2),
      height: Math.min(view.height - y, box.height + air * 2),
    },
  });
}

/** Brings a region to the top of the window, under the top bar, before a shot. */
export async function bringToTop(region: Locator, offset = 96): Promise<void> {
  await region.evaluate((el, by) => {
    const top = el.getBoundingClientRect().top + window.scrollY - by;
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
  }, offset);
}
