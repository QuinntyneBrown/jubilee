import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { test as base, type Locator, type Page } from '@playwright/test';
import { Jb } from './jb-test';
import { installMockApi } from './mock-api';

/**
 * Recording a narrated demo video (docs/videos/README.md, "How a demo video is built").
 *
 * A demo is not a test: `npm test` never runs it. `tools/video-demo/build.mjs` speaks the lines of
 * the folder's `narration.json`, then runs the folder's `demo.spec.ts` under
 * `playwright.demo.config.ts`. The spec drives the app, answered from the recorded API like every
 * spec (ADR 0009), and each `demo.scene(id, …)` lasts at least as long as its line takes to say.
 * The frames come from Chromium's screencast at 1920x1080 and are written, with the time each
 * scene began, to `.cache/video-demo/<folder>/` for the builder to cut.
 */

const repo = resolve(__dirname, '..', '..');
const SIZE = { width: 1280, height: 720 };

interface Frame {
  t: number;
  file: string;
}

export class Demo {
  readonly scenes: { id: string; start: number; end: number }[] = [];

  constructor(
    readonly page: Page,
    readonly jb: Jb,
    private readonly durations: Record<string, number>,
  ) {}

  /**
   * One narrated scene: runs `actions` while the line with this id is spoken, then waits until the
   * line has finished. A scene with no actions holds the picture for the length of its line.
   */
  async scene(id: string, actions?: () => Promise<void>): Promise<void> {
    const seconds = this.durations[id];
    if (seconds === undefined) throw new Error(`narration.json has no line with the id "${id}"`);
    const start = Date.now();
    await actions?.();
    const left = seconds * 1000 + 700 - (Date.now() - start);
    if (left > 0) await this.page.waitForTimeout(left);
    this.scenes.push({ id, start: start / 1000, end: Date.now() / 1000 });
  }

  /** Holds the picture. */
  async pause(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /** Moves the pointer to the element, so the viewer sees where it goes, then clicks it. */
  async click(target: Locator): Promise<void> {
    await this.point(target);
    await target.click();
    await this.page.waitForTimeout(350);
  }

  /** Moves the pointer onto the element without clicking. */
  async point(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (box) {
      await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 24 });
      await this.page.waitForTimeout(300);
    }
  }

  /** Types into a field key by key, as a person would. */
  async type(target: Locator, text: string): Promise<void> {
    await this.click(target);
    await target.pressSequentially(text, { delay: 45 });
    await this.page.waitForTimeout(250);
  }

  /** Scrolls the page smoothly by `pixels` (negative scrolls up). */
  async scroll(pixels: number): Promise<void> {
    const steps = Math.max(1, Math.round(Math.abs(pixels) / 40));
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, pixels / steps);
      await this.page.waitForTimeout(16);
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Covers the page with a card: a title and a few short lines. For the opening, the close and
   * work with nothing to show on a screen (a job, a rule of the API, a test). `hideCard` removes it.
   */
  async card(title: string, lines: string[] = [], kicker = 'jubilee'): Promise<void> {
    await this.page.evaluate(
      ([heading, body, mark]) => {
        document.getElementById('jb-demo-card')?.remove();
        const card = document.createElement('div');
        card.id = 'jb-demo-card';
        card.setAttribute('aria-hidden', 'true');
        card.style.cssText =
          'position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;justify-content:center;' +
          'gap:20px;padding:72px 96px;background:#14110d;color:#f6f1e7;' +
          "font-family:Archivo,Inter,system-ui,-apple-system,'Segoe UI',sans-serif;";
        const k = document.createElement('div');
        k.textContent = mark as string;
        k.style.cssText = 'font-weight:700;font-size:28px;letter-spacing:-0.03em;color:#e0b354;';
        const h = document.createElement('div');
        h.textContent = heading as string;
        h.style.cssText = 'font-weight:700;font-size:54px;line-height:1.08;letter-spacing:-0.02em;max-width:1000px;';
        card.append(k, h);
        for (const line of body as string[]) {
          const p = document.createElement('div');
          p.textContent = line;
          p.style.cssText = 'font-size:25px;line-height:1.4;max-width:1000px;color:#d9d0bf;';
          card.append(p);
        }
        document.documentElement.append(card);
      },
      [title, lines, kicker] as const,
    );
    await this.page.waitForTimeout(150);
  }

  async hideCard(): Promise<void> {
    await this.page.evaluate(() => document.getElementById('jb-demo-card')?.remove());
    await this.page.waitForTimeout(150);
  }
}

/** Draws the pointer, which a screencast does not show. */
function drawPointer(): void {
  const attach = (): void => {
    if (document.getElementById('jb-demo-pointer')) return;
    const dot = document.createElement('div');
    dot.id = 'jb-demo-pointer';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText =
      'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;' +
      'background:rgba(224,179,84,.55);border:2px solid rgba(20,17,13,.75);box-shadow:0 0 0 2px rgba(255,255,255,.7);' +
      'pointer-events:none;z-index:2147483647;transform:translate(-100px,-100px);';
    document.documentElement.append(dot);
    document.addEventListener(
      'mousemove',
      (e) => (dot.style.transform = `translate(${e.clientX}px,${e.clientY}px)`),
      true,
    );
    document.addEventListener('mousedown', () => (dot.style.background = 'rgba(224,179,84,.95)'), true);
    document.addEventListener('mouseup', () => (dot.style.background = 'rgba(224,179,84,.55)'), true);
  };
  if (document.documentElement) attach();
  document.addEventListener('DOMContentLoaded', attach);
}

export const test = base.extend<{ demo: Demo }>({
  demo: async ({ browser }, use, testInfo) => {
    const folder = dirname(testInfo.file);
    const cache = join(repo, '.cache', 'video-demo', basename(folder));
    const framesDir = join(cache, 'frames');
    const durations = JSON.parse(readFileSync(join(cache, 'durations.json'), 'utf8')) as Record<
      string,
      number
    >;
    rmSync(framesDir, { recursive: true, force: true });
    mkdirSync(framesDir, { recursive: true });

    const context = await browser.newContext({
      viewport: SIZE,
      deviceScaleFactor: 1.5,
      baseURL: 'http://localhost:4200',
      locale: 'en-CA',
      timezoneId: 'America/Toronto',
    });
    await context.addInitScript(drawPointer);
    const page = await context.newPage();
    const unanswered: string[] = [];
    await page.addInitScript(() => {
      (globalThis as { __jbTimings?: object }).__jbTimings = { retryWindow: 0 };
    });
    await installMockApi(page, unanswered);

    const frames: Frame[] = [];
    const cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = join(framesDir, `${String(frames.length).padStart(6, '0')}.jpg`);
      writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ t: metadata.timestamp ?? Date.now() / 1000, file });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    const screencast = { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080 } as const;
    await cdp.send('Page.startScreencast', screencast);
    // A navigation to another origin (the marketing site, the admin application) ends the screencast.
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) cdp.send('Page.startScreencast', screencast).catch(() => {});
    });

    const demo = new Demo(page, new Jb(page), durations);
    await use(demo);

    await page.waitForTimeout(400);
    await cdp.send('Page.stopScreencast').catch(() => {});
    const end = Date.now() / 1000;
    await context.close();
    writeFileSync(
      join(cache, 'timeline.json'),
      JSON.stringify({ frames, scenes: demo.scenes, end, unanswered }, null, 1),
    );
  },
});

export { expect } from '@playwright/test';
