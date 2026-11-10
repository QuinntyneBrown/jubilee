#!/usr/bin/env python3
"""Write a synthesized soca-style groove to use until a licensed track is dropped in.

    python tools/video-audio/placeholder_music.py docs/videos/NN-topic/music.wav [seconds]   (then convert: ffmpeg -i music.wav music.mp3)

132 BPM, C major, I-IV-V-IV: four-on-the-floor kick, off-beat snare and shaker, a syncopated bass,
brass stabs and a steel-pan lead. Deterministic. Replace the file with a real track (any format ffmpeg
reads) and rebuild; the builder only needs the path.
"""
import sys
import numpy as np, soundfile as sf

SR, BPM = 44100, 132
STEP = 60 / BPM / 4
rng = np.random.default_rng(7)
f = lambda midi: 440 * 2 ** ((midi - 69) / 12)


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / decay)


def kick():
    n = int(0.28 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (48 * t + 22 * (1 - np.exp(-t * 38)))) * np.exp(-t / 0.09)


def snare():
    n = int(0.16 * SR); t = np.arange(n) / SR
    return (rng.standard_normal(n) * 0.7 + np.sin(2 * np.pi * 210 * t) * 0.5) * np.exp(-t / 0.045)


def hat(decay=0.018):
    n = int(0.06 * SR)
    x = rng.standard_normal(n)
    return np.diff(x, prepend=0) * np.exp(-np.arange(n) / SR / decay)


def tone(midi, dur, kind):
    n = int(dur * SR); t = np.arange(n) / SR; w = 2 * np.pi * f(midi) * t
    if kind == "pan":   # steel pan: bright attack, quick decay, a slightly sharp octave partial
        return (np.sin(w) + 0.5 * np.sin(2.003 * w) * np.exp(-t / 0.08) + 0.25 * np.sin(3.01 * w) * np.exp(-t / 0.04)) * env(n, 0.003, 0.22)
    if kind == "bass":
        return (np.sin(w) + 0.35 * np.sin(2 * w)) * env(n, 0.005, 0.16)
    x = sum(np.sin(k * w) / k for k in range(1, 7))  # brass stab
    return x * env(n, 0.012, 0.09) * 0.5


def main():
    out, seconds = sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 46
    bars = int(np.ceil(seconds / (STEP * 16)))
    mix = np.zeros(int((bars * 16 + 8) * STEP * SR))

    def put(sound, step, gain):
        i = int(step * STEP * SR)
        mix[i:i + len(sound)] += sound[: len(mix) - i] * gain

    chords = [(48, [60, 64, 67]), (53, [60, 65, 69]), (55, [59, 62, 67]), (53, [60, 65, 69])]
    riffs = [[(0, 76), (3, 79), (6, 76), (8, 72), (11, 74), (14, 76)],
             [(0, 77), (3, 81), (6, 77), (8, 72), (10, 77), (12, 81), (14, 79)],
             [(0, 79), (2, 79), (4, 83), (6, 79), (8, 74), (11, 79), (14, 77)],
             [(0, 81), (3, 77), (6, 72), (8, 76), (10, 77), (12, 79), (14, 84)]]
    for b in range(bars):
        root, triad = chords[b % 4]
        s0 = b * 16
        intro = b == 0
        for s in (0, 4, 8, 12):
            put(kick(), s0 + s, 0.9)
        for s in ((3, 6, 11, 14) if not intro else (10, 11, 12, 13, 14, 15)):
            put(snare(), s0 + s, 0.34 if not intro else 0.2 + 0.03 * (s - 9))
        for s in range(16):
            put(hat(0.03 if s % 4 == 2 else 0.012), s0 + s, 0.16 if s % 4 == 2 else 0.07)
        if intro:
            continue
        for s, m in ((0, root), (3, root), (6, root + 7), (8, root), (11, root + 12), (14, root + 7)):
            put(tone(m - 12, 0.3, "bass"), s0 + s, 0.5)
        for s in (2, 6, 10, 14):
            for m in triad:
                put(tone(m, 0.2, "brass"), s0 + s, 0.07)
        for s, m in riffs[b % 4]:
            put(tone(m, 0.5, "pan"), s0 + s, 0.2)

    mix = np.tanh(mix[: int(seconds * SR)] * 1.3)
    mix /= np.abs(mix).max() / 0.9
    sf.write(out, np.stack([mix, mix], axis=1), SR, subtype="PCM_16")
    print(f"{out}: {seconds:.0f} s at {BPM} BPM")


if __name__ == "__main__":
    main()
