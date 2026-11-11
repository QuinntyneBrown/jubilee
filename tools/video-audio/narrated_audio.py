#!/usr/bin/env python3
"""Build the soundtrack of a narrated film that has no score of its own: the voice and a quiet piano bed.

    python tools/video-audio/narrated_audio.py docs/videos/02-business-plan [--voice af_heart] [--keep-voice] [--no-music]

film_audio.py is written for video 01's bar-by-bar score; this script keeps its narration (Kokoro-82M,
each phrase at the slowest speed that fits its window) and replaces the score with a soft bed: felt piano
and a pad on a I-vi-IV-V loop at the film's tempo, ducked under the voice.

Reads   narration.json   "bpm", "scenes" (three bars each) and the lines, as in film_audio.py
Writes  narration.wav    the fitted voice alone, film time, 24 kHz mono
        timing.js        window.TIMING: captions and spoken segments with start/end film seconds
        music.mp3        the bed alone, before ducking (not with --no-music)
        NN-topic.mp3     the mix: bed ducked under the voice, about -14 LUFS, peak -1 dB

Needs: pip install kokoro-onnx numpy, and ffmpeg (FFMPEG_PATH overrides).
"""
import argparse, json, os, sys, tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import film_audio as fa  # noqa: E402  (the voice, the instruments and the loudness helpers)

SR = fa.SR
CHORDS = [  # D, Bm, G, A: bass note and a close voicing around middle C
    (38, (57, 62, 66, 69)), (47, (59, 62, 66, 71)), (43, (59, 62, 67, 71)), (45, (57, 61, 64, 69)),
]


def bed(total, bpm):
    """A soft loop, one chord a bar: piano on beats 1 and 3, a broken chord between, and a pad."""
    beat = 60 / bpm
    bar = 4 * beat
    n = int(round(total * SR))
    wet = np.zeros(n + SR * 4)

    def put(x, at, gain):
        i = int(round(at * SR))
        if 0 <= i < n:
            wet[i:i + len(x)] += x[: len(wet) - i] * gain

    bars = int(np.ceil(total / bar))
    for k in range(bars):
        root, tones = CHORDS[k % 4]
        at = k * bar
        for j, m in enumerate((root + 12, *tones)):
            put(fa.piano(m, 1.8, soft=0.4), at + j * 0.025, 0.22)
        for j, m in enumerate((tones[1] + 12, tones[2] + 12, tones[3] + 12, tones[2] + 12)):
            put(fa.piano(m, 0.9, soft=0.5), at + (1.5 + j * 0.5) * beat, 0.1)
        put(fa.piano(tones[2], 1.2, soft=0.4), at + 2 * beat, 0.12)
        for m in (root + 12, *tones[1:]):
            put(fa.pad(m, bar + 0.6), at, 0.05)

    t = fa.ts(1.8)
    ir = fa.band(fa.rng.standard_normal(len(t)), 250, 6000) * np.exp(-t / 0.5)
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(wet) + len(ir))))
    room = np.fft.irfft(np.fft.rfft(wet, size) * np.fft.rfft(ir, size), size)[: len(wet)]
    left, right = wet + 0.4 * room, wet + 0.4 * np.roll(room, int(0.013 * SR))
    t = np.arange(len(wet)) / SR
    fade = np.clip(t / 1.2, 0, 1) * (1 - np.clip((t - (total - 3.0)) / 2.8, 0, 1))
    stereo = np.stack([left * fade, right * fade], axis=1)[:n]
    return stereo / np.abs(stereo).max()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=Path)
    ap.add_argument("--voice", default=None)
    ap.add_argument("--keep-voice", action="store_true")
    ap.add_argument("--no-music", action="store_true")
    a = ap.parse_args()
    folder, name = a.folder, a.folder.resolve().name
    spec = json.loads((folder / "narration.json").read_text(encoding="utf-8"))
    bpm = float(spec["bpm"])
    total = spec["scenes"] * 3 * 4 * 60 / bpm
    fa.TOTAL = total  # narrate() sizes the voice track and timing.js from this
    n = int(round(total * SR))

    if a.keep_voice:
        timing = (folder / "timing.js").read_text(encoding="utf-8")
        captions = json.loads(timing[timing.index("{"): timing.rindex("}") + 1])["captions"]
    else:
        voice = a.voice or os.environ.get("KOKORO_VOICE") or spec.get("voice", "af_heart")
        print(f"narration, voice {voice}, {total:.2f} s")
        captions = fa.narrate(folder, voice)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        fa.ffmpeg("-y", "-i", str(folder / "narration.wav"), "-ar", str(SR), "-ac", "1", str(tmp / "voice.wav"))
        voice = fa.read_wav(tmp / "voice.wav")
        voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
        rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 0.02 * np.abs(x).max()] ** 2))
        voice *= 0.16 / rms(voice)
        mix = np.stack([voice, voice], axis=1)

        def write(x, path, target):
            """Level to the target loudness, hold peaks under -1 dB, encode."""
            fa.write_wav(tmp / "a.wav", x / max(1.0, np.abs(x).max()), SR)
            x = x / max(1.0, np.abs(x).max()) * 10 ** ((target - fa.lufs(tmp / "a.wav")) / 20)
            knee = 0.7
            over = np.abs(x) > knee
            x[over] = np.sign(x[over]) * (knee + (0.89 - knee) * np.tanh((np.abs(x[over]) - knee) / (0.89 - knee)))
            fa.write_wav(tmp / "b.wav", x, SR)
            fa.ffmpeg("-y", "-i", str(tmp / "b.wav"), "-ac", "2", "-b:a", "192k", str(path))
            print(f"  {path.name}: {fa.lufs(path):.1f} LUFS, peak {20 * np.log10(np.abs(x).max()):.1f} dB")

        if not a.no_music:
            print("music")
            track = bed(total, bpm)
            # Kept well under the voice (about -20 dB), and ducked another 6 dB while anyone speaks.
            track *= 0.016 / np.sqrt(np.mean(track ** 2))
            t = np.arange(n) / SR
            duck = np.ones(n)
            for c in captions:
                duck = np.minimum(duck, 1 - 0.5 * np.clip((t - c["start"] + 0.25) / 0.2, 0, 1) * np.clip((c["end"] + 0.15 - t) / 0.35, 0, 1))
            write(track.copy(), folder / "music.mp3", -20)
            mix = mix + track * duck[:, None]
        write(mix, folder / f"{name}.mp3", -14)


if __name__ == "__main__":
    main()
