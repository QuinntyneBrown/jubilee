#!/usr/bin/env node
// Render a pitch film from docs/videos/NN-topic (slides.html + film.js, timing.js, NN-topic.mp3).
//
//   node tools/video-build/build.mjs docs/videos/NN-topic --check                 print the schedule and the captions
//   node tools/video-build/build.mjs docs/videos/NN-topic --frame 12.5 out.png    render one frame (film seconds)
//   node tools/video-build/build.mjs docs/videos/NN-topic [--no-captions]         captions.vtt + NN-topic.mp4
//   ... [--fps 30] [--crf 20]                                                       frame rate and quality (default 60 and 16)
//
// The full build seeks the deck frame by frame (1920x1080, 60 fps) and muxes the frames with NN-topic.mp3,
// which tools/video-audio/film_audio.py writes first. Captions are burned in, as the build spec asks,
// unless --no-captions is passed; captions.vtt is written beside the MP4 either way.
// Needs Node, Playwright with Chromium (NODE_PATH=e2e/node_modules finds the repository's copy), ffmpeg
// with libx264 (FFMPEG_PATH overrides) and a network connection: the deck hotlinks its photos and Inter.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => (flag(name) ? +args[args.indexOf(name) + 1] : fallback);
const FPS = option('--fps', 60);
const CRF = option('--crf', 16);
const folder = path.resolve(args[0] ?? '');
const name = path.basename(folder);
if (!fs.existsSync(path.join(folder, 'slides.html'))) {
  console.error('usage: build.mjs docs/videos/NN-topic [--check | --frame <seconds> <png>] [--no-captions] [--fps <n>] [--crf <n>]');
  process.exit(2);
}

const stamp = (t) => `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;

// Open the deck, wait for its fonts and photos, and stop on anything it reports.
let browser;
async function open() {
  await browser?.close().catch(() => {});
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (e) => { console.error(e); process.exit(1); });
  await page.goto(`${pathToFileURL(path.join(folder, 'slides.html'))}?render=1${flag('--no-captions') ? '&captions=0' : ''}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.PITCH.ready);
  const errors = await page.evaluate(() => window.PITCH.errors);
  if (errors.length) throw new Error(errors.join('; '));
  return page;
}

try {
  let page = await open();
  const pitch = await page.evaluate(() => ({ duration: window.PITCH.duration, schedule: window.PITCH.schedule, captions: window.PITCH.captions }));

  if (flag('--frame')) {
    const at = args.indexOf('--frame');
    await page.evaluate((t) => window.PITCH.seek(t), +args[at + 1]);
    await page.screenshot({ path: args[at + 2] });
  } else if (flag('--check')) {
    for (const s of pitch.schedule) console.log(`${stamp(s.start)}  ${(s.end - s.start).toFixed(1).padStart(5)} s  ${s.id}`);
    for (const c of pitch.captions) console.log(`  ${c.start.toFixed(2).padStart(6)}–${c.end.toFixed(2).padStart(5)}  ${c.text}`);
    console.log(`total ${pitch.duration.toFixed(2)} s, ${Math.round(pitch.duration * FPS)} frames at ${FPS} fps`);
  } else {
    const mp3 = path.join(folder, `${name}.mp3`);
    if (!fs.existsSync(mp3)) throw new Error(`${mp3} is missing: run tools/video-audio/film_audio.py first`);
    if (!pitch.captions.length) throw new Error('timing.js has no captions: run tools/video-audio/film_audio.py first');
    fs.writeFileSync(path.join(folder, 'captions.vtt'), `WEBVTT\n\n${pitch.captions.map((c) => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')}`);

    // Seek the deck frame by frame and pipe the screenshots to ffmpeg. Every draw is synchronous
    // (the aurora keeps its drawing buffer), so a frame is complete as soon as seek returns.
    // The browser is reopened every 600 frames, and after a crash, so a long render cannot run it out of memory.
    const mp4 = path.join(folder, `${name}.mp4`);
    const partial = path.join(folder, `${name}.partial.mp4`);
    const ffmpeg = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
      '-i', mp3, '-map', '0:v', '-map', '1:a',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k',
      '-movflags', '+faststart', '-t', String(pitch.duration), partial],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    const frames = Math.round(pitch.duration * FPS);
    for (let i = 0, retries = 0; i < frames; i++) {
      let jpeg;
      try {
        if (i && i % 600 === 0) page = await open();
        await page.evaluate((t) => window.PITCH.seek(t), i / FPS);
        jpeg = await page.screenshot({ type: 'jpeg', quality: 98 });
      } catch (e) {
        if (++retries > 20) throw e;
        console.log(`frame ${i}: the browser stopped (${String(e.message).slice(0, 80)}); reopening`);
        page = await open();
        i--;
        continue;
      }
      if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, 'drain');
      if (i % 300 === 0) console.log(`frame ${i}/${frames}`);
    }
    ffmpeg.stdin.end();
    const [code] = await once(ffmpeg, 'close');
    if (code !== 0) throw new Error('ffmpeg failed');
    fs.renameSync(partial, mp4);
    console.log(`wrote ${mp4}`);
  }
} finally {
  await browser?.close();
}
