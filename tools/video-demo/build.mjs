#!/usr/bin/env node
// Build a narrated demo video from docs/videos/NN-topic (narration.json + demo.spec.ts).
//
//   node tools/video-demo/build.mjs docs/videos/NN-topic            voice, recording, music, captions, mp4
//   node tools/video-demo/build.mjs docs/videos/NN-topic --check    speak the lines and print their lengths only
//   ... [--no-captions] [--no-music] [--keep-recording]             leave captions or music out; reuse the last recording
//
// 1. Speaks each line of narration.json with edge-tts (free, needs the network; `pip install edge-tts`).
// 2. Runs demo.spec.ts under e2e/playwright.demo.config.ts: the spec drives the app against the recorded
//    API (ADR 0009) and every scene lasts as long as its line. Frames and scene times go to .cache/video-demo/.
// 3. Lays each line at the start of its scene over the piano bed of video 02, ducked under the voice.
// 4. Encodes NN-topic.mp4 (1920x1080, 30 fps, captions burned in) and writes NN-topic.mp3, captions.vtt
//    and script.md beside it.
// Needs Node, the e2e dependencies (Playwright with Chromium), Python with edge-tts and ffmpeg with
// libx264 and libass (FFMPEG_PATH, FFPROBE_PATH and PYTHON override).
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const PYTHON = process.env.PYTHON || 'python3';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const folder = path.resolve(args[0] ?? '');
const name = path.basename(folder);
const narrationFile = path.join(folder, 'narration.json');
if (!fs.existsSync(narrationFile) || !fs.existsSync(path.join(folder, 'demo.spec.ts'))) {
  console.error('usage: build.mjs docs/videos/NN-topic [--check] [--no-captions] [--no-music] [--keep-recording]');
  process.exit(2);
}

const narration = JSON.parse(fs.readFileSync(narrationFile, 'utf8'));
const voice = narration.voice ?? 'en-CA-ClaraNeural';
const rate = narration.rate ?? '-4%';
const bed = path.resolve(repo, narration.music ?? 'docs/videos/02-business-plan/music.mp3');
const cache = path.join(repo, '.cache', 'video-demo', name);
fs.mkdirSync(path.join(cache, 'voice'), { recursive: true });

const run = (cmd, argv, options = {}) => execFileSync(cmd, argv, { stdio: ['ignore', 'pipe', 'inherit'], ...options }).toString();
const seconds = (file) => +run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim();
const stamp = (t) => `${String(Math.floor(t / 3600)).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;

// 1. The voice: one file per line, kept by the hash of what is said so an unchanged line is not spoken again.
const ids = new Set();
const durations = {};
const clips = {};
for (const line of narration.scenes) {
  if (!line.id || !line.say) throw new Error('every scene of narration.json needs an "id" and a "say"');
  if (ids.has(line.id)) throw new Error(`narration.json repeats the id "${line.id}"`);
  ids.add(line.id);
  const hash = createHash('sha1').update(`${voice}|${rate}|${line.say}`).digest('hex').slice(0, 16);
  const clip = path.join(cache, 'voice', `${hash}.mp3`);
  if (!fs.existsSync(clip)) {
    for (let attempt = 1; ; attempt++) {
      const said = spawnSync(PYTHON, ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, '--text', line.say, '--write-media', clip], { stdio: ['ignore', 'ignore', 'inherit'] });
      if (said.status === 0 && fs.existsSync(clip) && fs.statSync(clip).size > 0) break;
      fs.rmSync(clip, { force: true });
      if (attempt === 4) throw new Error(`edge-tts could not speak "${line.id}"`);
    }
  }
  clips[line.id] = clip;
  durations[line.id] = seconds(clip);
}
fs.writeFileSync(path.join(cache, 'durations.json'), JSON.stringify(durations, null, 1));
const spoken = Object.values(durations).reduce((a, b) => a + b, 0);
for (const line of narration.scenes) console.log(`${durations[line.id].toFixed(1).padStart(6)} s  ${line.id}`);
console.log(`spoken ${spoken.toFixed(1)} s in ${narration.scenes.length} scenes, voice ${voice}`);
if (flag('--check')) process.exit(0);

// 2. The recording.
const timelineFile = path.join(cache, 'timeline.json');
if (!flag('--keep-recording') || !fs.existsSync(timelineFile)) {
  fs.rmSync(timelineFile, { force: true });
  const env = { ...process.env };
  for (const key of ['JB_SWEEPS', 'JB_BASELINE', 'JB_PARITY', 'JB_RECORD_API', 'CI']) delete env[key];
  // On Windows npx is a .cmd file, which only a shell can start.
  const recorded = spawnSync('npx', ['playwright', 'test', '-c', 'playwright.demo.config.ts', path.join(folder, 'demo.spec.ts')], { cwd: path.join(repo, 'e2e'), stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (recorded.status !== 0 || !fs.existsSync(timelineFile)) throw new Error('the recording failed: see the Playwright output above');
}
const timeline = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
if (timeline.unanswered?.length) console.warn(`API requests without a recorded answer: ${timeline.unanswered.join(', ')}`);
const missing = narration.scenes.filter((line) => !timeline.scenes.some((s) => s.id === line.id)).map((line) => line.id);
if (missing.length) throw new Error(`demo.spec.ts never played: ${missing.join(', ')}`);
if (!timeline.frames.length) throw new Error('the recording has no frames');

// The film starts half a second before the first scene and ends when the recording does.
const t0 = Math.max(timeline.frames[0].t, timeline.scenes[0].start - 0.5);
const total = timeline.end - t0;
const frames = timeline.frames.filter((f, i, all) => (all[i + 1]?.t ?? Infinity) > t0);
const concat = ['ffconcat version 1.0'];
frames.forEach((f, i) => {
  const from = Math.max(f.t, t0);
  const to = frames[i + 1]?.t ?? timeline.end;
  concat.push(`file '${f.file.replaceAll("'", "'\\''")}'`, `duration ${Math.max(to - from, 0.001).toFixed(4)}`);
});
concat.push(`file '${frames.at(-1).file.replaceAll("'", "'\\''")}'`);
const concatFile = path.join(cache, 'frames.ffconcat');
fs.writeFileSync(concatFile, concat.join('\n'));

// 3. Captions: each line cut into phrases, timed by their share of the line.
const captions = [];
for (const line of narration.scenes) {
  const start = timeline.scenes.find((s) => s.id === line.id).start - t0 + 0.15;
  const phrases = [];
  let current = '';
  for (const word of line.say.split(/\s+/)) {
    if (current && (current.length + word.length + 1 > 72 || (/[.!?]$/.test(current) && current.length > 36))) {
      phrases.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) phrases.push(current);
  const letters = phrases.reduce((n, p) => n + p.length, 0);
  let at = start;
  for (const phrase of phrases) {
    const length = (durations[line.id] * phrase.length) / letters;
    captions.push({ start: at, end: at + length, text: phrase });
    at += length;
  }
}
fs.writeFileSync(path.join(folder, 'captions.vtt'), `WEBVTT\n\n${captions.map((c) => `${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')}`);
const srt = path.join(cache, 'captions.srt');
fs.writeFileSync(srt, captions.map((c, i) => `${i + 1}\n${stamp(c.start).replace('.', ',')} --> ${stamp(c.end).replace('.', ',')}\n${c.text}\n`).join('\n'));
fs.writeFileSync(
  path.join(folder, 'script.md'),
  `# ${narration.title ?? name}\n\nThe transcript, written from \`narration.json\` by \`tools/video-demo/build.mjs\`.\n\n${narration.scenes.map((line) => `${line.say}\n`).join('\n')}`,
);

// 4. The sound: every line at the start of its scene, over the bed, which is turned down while the voice speaks.
const mp3 = path.join(folder, `${name}.mp3`);
const inputs = [];
const graph = [];
narration.scenes.forEach((line, i) => {
  const at = Math.round((timeline.scenes.find((s) => s.id === line.id).start - t0 + 0.15) * 1000);
  inputs.push('-i', clips[line.id]);
  graph.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${at}:all=1[v${i}]`);
});
const n = narration.scenes.length;
graph.push(`${narration.scenes.map((_, i) => `[v${i}]`).join('')}amix=inputs=${n}:normalize=0:dropout_transition=0,apad=whole_dur=${total.toFixed(3)},atrim=0:${total.toFixed(3)},volume=1.7,asplit=2[voice][key]`);
if (flag('--no-music')) {
  graph.push('[key]anullsink', '[voice]alimiter=limit=0.89[out]');
} else {
  inputs.push('-stream_loop', '-1', '-i', bed);
  const fade = Math.max(total - 3, 0).toFixed(3);
  graph.push(
    `[${n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${total.toFixed(3)},volume=0.5,afade=t=in:d=1.5,afade=t=out:st=${fade}:d=3[bed]`,
    '[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=40:release=700[ducked]',
    '[voice][ducked]amix=inputs=2:normalize=0:dropout_transition=0,alimiter=limit=0.89[out]',
  );
}
run(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph.join(';'), '-map', '[out]', '-t', total.toFixed(3), '-c:a', 'libmp3lame', '-b:a', '192k', mp3]);

// 5. The picture and the sound together.
const mp4 = path.join(folder, `${name}.mp4`);
const style = 'FontName=Arial,FontSize=12,PrimaryColour=&H00FFFFFF,BackColour=&H30000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=22';
const picture = ['scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x14110d', 'fps=30'];
if (!flag('--no-captions')) picture.push(`subtitles='${srt.replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'")}':force_style='${style}'`);
run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', concatFile, '-i', mp3, '-map', '0:v', '-map', '1:a',
  '-vf', picture.join(','), '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', '-t', total.toFixed(3), mp4]);
console.log(`${path.relative(repo, mp4)}  ${stamp(total)}  ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB  ${frames.length} frames`);
