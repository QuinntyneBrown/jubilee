#!/usr/bin/env node
// Build an animated pitch video from docs/videos/NN-topic (script.md -> timing.js, slides.html, music).
//
//   node tools/video-build/build.mjs docs/videos/NN-topic --shots     capture the mock screenshots in shots.json
//   node tools/video-build/build.mjs docs/videos/NN-topic --check     resolve every cue and print the schedule
//   node tools/video-build/build.mjs docs/videos/NN-topic --frame 12.5 out.png   render one frame
//   node tools/video-build/build.mjs docs/videos/NN-topic [--music file] [--burn-captions]
//
// The full build writes NN-topic.mp3 (narration over the music: full level in the intro and outro,
// ducked under the voice), captions.vtt and NN-topic.mp4 (1920x1080, 30 fps). The MP4 has no captions
// unless --burn-captions is passed; captions.vtt sits beside it for players that load a sidecar file.
// Needs Node, Playwright with Chromium, and ffmpeg (FFMPEG_PATH).
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FPS = 30;
const MUSIC_LUFS = -13; // loudness of the music on its own, in the intro and outro
const MUSIC_UNDER = 0.22; // the fraction of that level left under the narration

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const folder = path.resolve(args[0] ?? '');
const name = path.basename(folder);
if (!fs.existsSync(path.join(folder, 'slides.html'))) {
  console.error('usage: build.mjs docs/videos/NN-topic [--shots | --check | --frame <seconds> <png>] [--music file] [--burn-captions]');
  process.exit(2);
}

const run = (cmd, argv) => {
  const r = spawnSync(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
};
const stamp = (t) => `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  if (flag('--shots')) {
    const spec = JSON.parse(fs.readFileSync(path.join(folder, 'shots.json'), 'utf8'));
    fs.mkdirSync(path.join(folder, 'shots'), { recursive: true });
    for (const [kind, viewport, scale] of [['desktop', { width: 1280, height: 800 }, 1.5], ['phone', { width: 390, height: 844 }, 2]]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: kind === 'phone', hasTouch: kind === 'phone' });
      const page = await context.newPage();
      for (const mock of spec[kind] ?? []) {
        await page.goto(`${pathToFileURL(path.resolve(folder, spec.mocks, `${mock}.html`))}?chrome=0&theme=light`);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500); // let dialogs finish opening
        await page.screenshot({ path: path.join(folder, 'shots', `${mock.split('/')[1]}-${kind}.png`) });
      }
      await context.close();
    }
    console.log(`shots written to ${path.join(folder, 'shots')}`);
  } else {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', (e) => { throw e; });
    await page.goto(`${pathToFileURL(path.join(folder, 'slides.html'))}?render=1${flag('--burn-captions') ? '&captions=1' : ''}`);
    await page.evaluate(() => window.PITCH.ready);
    const pitch = await page.evaluate(() => ({ ...window.PITCH, ready: null, seek: null }));
    for (const s of pitch.schedule) console.log(`${stamp(s.start)}  ${(s.end - s.start).toFixed(1).padStart(5)} s  ${s.id}`);
    console.log(`total ${pitch.duration.toFixed(1)} s`);
    if (pitch.errors.length) throw new Error(pitch.errors.join('\n'));

    if (flag('--frame')) {
      await page.evaluate((t) => window.PITCH.seek(t), +option('--frame'));
      await page.screenshot({ path: args[args.indexOf('--frame') + 2] });
    } else if (!flag('--check')) {
      // Audio: music at full level for the intro and outro, ducked under the narration, faded at the end.
      const music = option('--music') ?? ['music.mp3', 'music.wav', 'music.m4a', 'music.ogg'].map((f) => path.join(folder, f)).find(fs.existsSync);
      if (!music) throw new Error('no music file: pass --music <file> or add music.mp3 to the folder');
      const { intro, duration, musicStart } = pitch, voiceEnd = duration - pitch.outro;
      // The stretch of the track the video plays: from data-music-start, looping if the track is short.
      const excerpt = `aresample=44100,atrim=${musicStart}:${musicStart + duration},asetpts=PTS-STARTPTS`;
      const measured = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-stream_loop', '-1', '-i', music, '-af', `${excerpt},ebur128=framelog=quiet`, '-f', 'null', '-'], { encoding: 'utf8' });
      const lufs = +[...measured.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()?.[1];
      if (!Number.isFinite(lufs)) throw new Error(`could not measure the loudness of ${music}`);
      const gain = 10 ** ((MUSIC_LUFS - lufs) / 20);
      console.log(`music ${path.basename(music)} from ${musicStart} s: ${lufs} LUFS, gain ${gain.toFixed(2)}`);
      const level = `${gain}*(${MUSIC_UNDER}+${1 - MUSIC_UNDER}*(1-clip((t-${intro - 0.35})/0.5,0,1)+clip((t-${voiceEnd - 0.1})/0.6,0,1)))`;
      const mp3 = path.join(folder, `${name}.mp3`);
      run(FFMPEG, ['-y', '-loglevel', 'error', '-i', path.join(folder, 'narration.wav'), '-stream_loop', '-1', '-i', music, '-filter_complex',
        `[0:a]aresample=44100,adelay=${intro * 1000}:all=1,volume=1.5[v];` +
        `[1:a]${excerpt},volume='${level}':eval=frame,afade=t=out:st=${duration - 0.9}:d=0.9[m];` +
        `[v][m]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95,atrim=0:${duration}[a]`,
        '-map', '[a]', '-ac', '2', '-b:a', '192k', mp3]);

      const vtt = path.join(folder, 'captions.vtt');
      fs.writeFileSync(vtt, `WEBVTT\n\n${pitch.sentences.map((s) => `${stamp(intro + s.start)} --> ${stamp(intro + s.end)}\n${s.text}\n`).join('\n')}`);

      // Video: seek the deck frame by frame and pipe the screenshots to ffmpeg.
      const mp4 = path.join(folder, `${name}.mp4`);
      const ffmpeg = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
        '-i', mp3, '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart', '-t', String(duration), mp4],
        { stdio: ['pipe', 'inherit', 'inherit'] });
      const frames = Math.round(duration * FPS);
      for (let i = 0; i < frames; i++) {
        await page.evaluate((t) => window.PITCH.seek(t), i / FPS);
        const jpeg = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, 'drain');
        if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
      }
      ffmpeg.stdin.end();
      const [code] = await once(ffmpeg, 'close');
      if (code !== 0) throw new Error('ffmpeg failed');
      console.log(`wrote ${mp4}`);
    }
  }
} finally {
  await browser.close();
}
