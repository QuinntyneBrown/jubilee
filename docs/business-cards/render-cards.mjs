/**
 * Renders the Jubilee business cards to print-ready PNGs at full-bleed size.
 *
 *   node docs/business-cards/render-cards.mjs
 *
 * Playwright is borrowed from e2e/node_modules (run `npm install` in e2e/ first).
 *
 * Each .card-face in src/cards.html is 3.61 x 2.11 em with 1em = 600 px, so
 * every PNG is 2166 x 1266 px: Vistaprint's full-bleed size at 600 DPI.
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const moduleRoot = process.env.JUBILEE_MODULE_ROOT ?? path.join(repoRoot, 'e2e');

const require = createRequire(pathToFileURL(path.join(moduleRoot, 'package.json')));
const { chromium } = require('@playwright/test');

/** The id of each .card-face is the name of its PNG. */
const FACES = ['front', 'quinntyne-brown-back', 'jordan-renda-back'];

const FONTS = [
  ['Archivo', '700 93px "Archivo"'],
  ['Inter', '500 59px "Inter"'],
];

const browser = await chromium.launch({
  args: ['--allow-file-access-from-files', '--font-render-hinting=none'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 2200, height: 1300 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(path.join(here, 'src', 'cards.html')).href, { waitUntil: 'load' });

  // Fail rather than ship a fallback face.
  const missing = await page.evaluate(async (fonts) => {
    await Promise.all(fonts.map(([, spec]) => document.fonts.load(spec).catch(() => {})));
    await document.fonts.ready;
    return fonts.filter(([, spec]) => !document.fonts.check(spec)).map(([name]) => name);
  }, FONTS);
  if (missing.length) {
    throw new Error(`web fonts did not load: ${missing.join(', ')}`);
  }

  for (const id of FACES) {
    const out = path.join(here, `${id}.png`);
    await page.locator(`#${id}`).screenshot({ path: out, animations: 'disabled' });

    const png = await readFile(out);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    if (width !== 2166 || height !== 1266) {
      throw new Error(`${id}: expected 2166x1266, got ${width}x${height}`);
    }
    console.log(`✓ ${`${id}.png`.padEnd(28)} ${width}x${height}px (3.61" x 2.11" at 600 DPI)`);
  }
  await context.close();
} finally {
  await browser.close();
}
