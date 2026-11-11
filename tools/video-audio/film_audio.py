#!/usr/bin/env python3
"""Build the soundtrack of the Meet Jubilee pitch film: narration, music, sound effects and the mix.

    python tools/video-audio/film_audio.py docs/videos/01-jubilee-pitch [--voice af_heart] [--keep-voice]

Everything here is a synthesized STAND-IN for the film's audio brief (Magic Patterns "Pitch Video Build
Spec", sections 2 and 3): the brief asks for a composed gospel-pop track with a real choir and a
recorded Canadian-English voice. What this script does keep exactly is the grid: 100 BPM, 27 bars,
64.80 s, D major lifting to E at bar 19, and every hit point on its film time.

Reads   narration.json   the lines, their windows and the words that must land on a time
Writes  narration.wav    the fitted voice alone, film time, 24 kHz mono (Kokoro-82M, run locally)
        timing.js        window.TIMING: captions and spoken segments with start/end film seconds
        music.mp3        the synthesized track alone, before ducking
        sfx.mp3          the synthesized sound effects alone
        NN-topic.mp3     the mix: music ducked 6 dB under the voice, about -14 LUFS, peak -1 dB

--keep-voice reuses narration.wav and timing.js and only rebuilds the music, the effects and the mix.
The Kokoro model and voice are looked for in KOKORO_DIR, .cache/kokoro and the Hugging Face cache, and
downloaded once from huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX into .cache/kokoro otherwise.
Needs: pip install kokoro-onnx numpy, and ffmpeg (FFMPEG_PATH overrides).
"""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.request, wave
from pathlib import Path

import numpy as np

REPO = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main"
FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")
SR = 44100
BPM, BEAT = 100, 0.6
BAR = BEAT * 4
TOTAL = BAR * 27  # 64.80 s
N = int(round(TOTAL * SR))
rng = np.random.default_rng(1225)


def write_wav(path, x, sr):
    """16-bit PCM; x is mono (n,) or stereo (n, 2) in -1..1."""
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1 if x.ndim == 1 else x.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def read_wav(path):
    with wave.open(str(path), "rb") as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float64) / 32768


# ── Narration ────────────────────────────────────────────────────────────────────────────────────────

def fetch(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    urllib.request.urlretrieve(url, tmp)
    tmp.rename(dest)


def kokoro(voice: str):
    """The model and the voice, from a local cache when one has them."""
    from kokoro_onnx import Kokoro
    cache = Path(os.environ.get("KOKORO_DIR", ".cache/kokoro"))
    hub = sorted(Path.home().glob(".cache/huggingface/hub/models--onnx-community--Kokoro-82M-v1.0-ONNX/snapshots/*"))
    model = next((p for p in [cache / "kokoro.onnx", *(h / "onnx/model.onnx" for h in hub)] if p.exists()), None)
    style = next((p for p in [cache / f"{voice}.bin", *(h / f"voices/{voice}.bin" for h in hub)] if p.exists()), None)
    if model is None:
        model = cache / "kokoro.onnx"
        fetch(f"{REPO}/onnx/model.onnx", model)
    if style is None:
        style = cache / f"{voice}.bin"
        fetch(f"{REPO}/voices/{voice}.bin", style)
    # kokoro-onnx reads voices from an .npz; the Hub ships one raw float32 file per voice.
    npz = Path(tempfile.gettempdir()) / f"kokoro-{voice}.npz"
    np.savez(npz, **{voice: np.fromfile(style, dtype=np.float32).reshape(-1, 1, 256)})
    return Kokoro(str(model), str(npz))


def narrate(folder: Path, voice: str):
    """Speak every segment at the slowest speed that fits its window, and place it on its film time."""
    spec = json.loads((folder / "narration.json").read_text(encoding="utf-8"))
    tts, memo, vsr = kokoro(voice), {}, 24000

    def say(text, speed):
        if (text, speed) not in memo:
            x, sr = tts.create(text, voice=voice, speed=speed, lang="en-us")
            x = np.asarray(x, dtype=np.float32)
            loud = np.flatnonzero(np.abs(x) > 0.02 * np.abs(x).max())
            memo[text, speed] = x[max(0, loud[0] - int(0.01 * sr)): loud[-1] + int(0.04 * sr)]
        return memo[text, speed]

    def place(seg, speed):
        """Start time of the segment at this speed, or None when it does not fit its window."""
        x = say(seg["text"], speed)
        dur, start = len(x) / vsr, seg["start"]
        # A phrase spoken alone ends longer than it does mid-sentence, hence the 0.9.
        if "lead" in seg:
            start = seg["hit"] - 0.9 * len(say(seg["lead"], speed)) / vsr
        elif "tail" in seg:
            start = seg["hit"] - (dur - 0.9 * len(say(seg["tail"], speed)) / vsr)
        if start < seg["start"] - 0.06:
            return None
        return max(start, seg["start"]) if start + dur <= seg["end"] + 0.04 else None

    out = np.zeros(int(TOTAL * vsr), dtype=np.float32)
    captions, segments = [], []
    speeds = [float(v) for v in np.arange(1.0, 1.85, 0.05).round(2)]
    for line in spec["lines"]:
        # Each phrase takes the slowest speed that fits its window; the rest of its line is kept
        # within 0.2 of the fastest, so the voice does not lurch between phrases.
        need = [next((v for v in speeds if place(seg, v) is not None), None) for seg in line["segments"]]
        if None in need:
            sys.exit(f"narration: scene {line['scene']} does not fit its windows even at speed 1.8")
        pace = [max(v, round(max(need) - 0.2, 2)) for v in need]
        starts = [place(seg, v) for seg, v in zip(line["segments"], pace)]
        if None in starts:
            pace, starts = need, [place(seg, v) for seg, v in zip(line["segments"], need)]
        for seg, start, speed in zip(line["segments"], starts, pace):
            x = say(seg["text"], speed)
            x = x / max(1e-6, float(np.abs(x).max()))
            i = int(start * vsr)
            out[i:i + len(x)] += x[: len(out) - i]
            end = start + len(x) / vsr
            segments.append({"text": seg["text"], "start": round(start, 3), "end": round(end, 3), "speed": speed})
            if "caption" in seg:
                captions.append({"text": seg["caption"], "start": round(start, 3), "end": round(end + 0.3, 3)})
            else:
                captions[-1]["end"] = round(end + 0.3, 3)
            words = len(seg["text"].split())
            print(f"  {start:6.2f}-{end:6.2f}  x{speed:.2f}  {words / (end - start) * 60:4.0f} wpm  {seg['text']}")
    for a, b in zip(captions, captions[1:]):
        a["end"] = min(a["end"], b["start"])
    write_wav(folder / "narration.wav", out * 0.89, vsr)
    (folder / "timing.js").write_text(
        "// Generated by tools/video-audio/film_audio.py. Do not edit.\n"
        f"window.TIMING = {json.dumps({'voice': voice, 'duration': TOTAL, 'captions': captions, 'segments': segments}, indent=1, ensure_ascii=False)};\n",
        encoding="utf-8")
    return captions


# ── Synthesis ────────────────────────────────────────────────────────────────────────────────────────

hz = lambda midi: 440.0 * 2 ** ((midi - 69) / 12)
ts = lambda dur: np.arange(int(dur * SR)) / SR


def band(x, lo, hi):
    """Keep lo..hi Hz, with soft edges."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.clip((f - lo * 0.8) / (lo * 0.2 + 1), 0, 1) * np.clip((hi * 1.25 - f) / (hi * 0.25 + 1), 0, 1)
    return np.fft.irfft(X * gain, len(x))


def noise(dur, lo, hi):
    return band(rng.standard_normal(int(dur * SR)), lo, hi)


def shape(n, attack, release):
    """Linear attack and release, in seconds, over n samples."""
    e = np.ones(n)
    a, r = min(n, int(attack * SR)), min(n, int(release * SR))
    if a: e[:a] *= np.linspace(0, 1, a)
    if r: e[-r:] *= np.linspace(1, 0, r)
    return e


def piano(midi, dur, soft=0.0):
    """Felt piano: a few slightly stretched partials, the high ones dying first."""
    t = ts(dur + 0.4); f = hz(midi); x = 0
    for k in range(1, 8):
        fk = f * k * np.sqrt(1 + 0.0005 * k * k)
        if fk > 5000: break
        x = x + np.sin(2 * np.pi * fk * t + k) * k ** -(1.7 + soft) * np.exp(-t * (0.9 + 0.55 * k))
    return x * shape(len(t), 0.008, 0.3)


def stab(midi, dur=0.14):
    """The same piano, muted: the ostinato."""
    t = ts(dur + 0.1); f = hz(midi)
    x = sum(np.sin(2 * np.pi * f * k * t) * k ** -2.0 for k in range(1, 5))
    return x * np.exp(-t / 0.07) * shape(len(t), 0.004, 0.05)


def pad(midi, dur):
    t = ts(dur); x = 0
    for cents in (-7, 0, 7):
        w = 2 * np.pi * hz(midi) * 2 ** (cents / 1200) * t
        x = x + sum(np.sin(k * w + cents) / k ** 2 for k in range(1, 6))
    return x / 3 * shape(len(t), min(0.9, dur / 3), min(0.9, dur / 3))


def rhodes(midi, dur):
    t = ts(dur + 0.3); w = 2 * np.pi * hz(midi) * t
    x = np.sin(w + (1.1 * np.exp(-t / 0.3) + 0.25) * np.sin(w)) + 0.08 * np.sin(7.0 * w) * np.exp(-t / 0.06)
    return x * np.exp(-t / 1.4) * (1 + 0.07 * np.sin(2 * np.pi * 4.8 * t)) * shape(len(t), 0.004, 0.25)


FORMANTS = {"oo": ((350, 1.0), (750, 0.32), (2600, 0.04)), "ah": ((720, 1.0), (1150, 0.55), (2700, 0.12))}


def choir(midi, dur, vowel="oo"):
    """Three voices singing one vowel: harmonics under a formant envelope, with a slow vibrato."""
    t = ts(dur); x = 0
    for v in range(3):
        f = hz(midi) * 2 ** (rng.uniform(-9, 9) / 1200)
        vib = 0.004 * np.clip((t - 0.25) / 0.4, 0, 1) * np.sin(2 * np.pi * rng.uniform(5.0, 5.9) * t + rng.uniform(0, 6))
        phase = 2 * np.pi * f * np.cumsum(1 + vib) / SR
        for k in range(1, int(3600 / f) + 1):
            g = sum(a * np.exp(-((f * k - c) / (90 + 0.12 * c)) ** 2) for c, a in FORMANTS[vowel]) / k ** 0.6
            if g > 0.004:
                x = x + g * np.sin(k * phase + rng.uniform(0, 6))
    return x / 3 * shape(len(t), min(0.28, dur / 3), min(0.45, dur / 3))


def bass(midi, dur):
    t = ts(dur); w = 2 * np.pi * hz(midi) * t
    return np.tanh(1.4 * (np.sin(w) + 0.45 * np.sin(2 * w) * np.exp(-t / 0.25))) * shape(len(t), 0.006, 0.06)


def kick(big=False):
    t = ts(0.5 if big else 0.34)
    sweep = np.sin(2 * np.pi * np.cumsum((42 if big else 46) + 110 * np.exp(-t * 32)) / SR)
    click = noise(len(t) / SR, 1500, 6000)[: len(t)] * np.exp(-t / 0.004)
    return (sweep * np.exp(-t / (0.2 if big else 0.13)) + 0.25 * click) * shape(len(t), 0.001, 0.05)


def clap():
    t = ts(0.26); x = np.zeros(len(t)); n = noise(0.26, 900, 4200)
    for d in (0.0, 0.011, 0.023):
        x += n * np.where(t >= d, np.exp(-(t - d) / 0.012), 0)
    return (x * 0.5 + n * np.exp(-t / 0.07) * 0.6) / np.abs(n).max()


def hat(open_=False):
    dur = 0.3 if open_ else 0.06
    n = noise(dur, 7000, 15000)
    return n / np.abs(n).max() * np.exp(-ts(dur)[: len(n)] / (0.09 if open_ else 0.014))


def snare():
    t = ts(0.22); n = noise(0.22, 1200, 9000)
    return (n / np.abs(n).max() * 0.8 + 0.5 * np.sin(2 * np.pi * 196 * t) * np.exp(-t / 0.03)) * np.exp(-t / 0.06)


def marimba(midi, dur=0.7):
    t = ts(dur); w = 2 * np.pi * hz(midi) * t
    return (np.sin(w) + 0.32 * np.sin(4 * w) * np.exp(-t / 0.05) + 0.1 * np.sin(10 * w) * np.exp(-t / 0.02)) * np.exp(-t / 0.22) * shape(len(t), 0.002, 0.05)


def pizz(midi):
    t = ts(0.45); w = 2 * np.pi * hz(midi) * t
    return sum(np.sin(k * w) / k * np.exp(-t * k / 0.16) for k in range(1, 7)) * shape(len(t), 0.002, 0.05)


def bell(midi, dur=2.4):
    t = ts(dur); f = hz(midi)
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in ((1, 1, 1.5), (2.76, 0.55, 0.9), (5.4, 0.3, 0.5), (8.93, 0.15, 0.25))) * shape(len(t), 0.002, 0.2)


def cymbal(dur=2.6):
    n = noise(dur, 3500, 16000)
    return n / np.abs(n).max() * np.exp(-ts(dur)[: len(n)] / (dur / 4.5))


def riser(dur):
    """Noise that opens up and a tone that climbs: the bar where everything else stops."""
    t = ts(dur); p = t / dur
    n = rng.standard_normal(len(t))
    lo, hi = band(n, 300, 2500), band(n, 2500, 14000)
    tone = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (3.2 * p)) / SR)
    return ((lo * (1 - p) + hi * p) / 3 + 0.25 * tone) * p ** 1.8


class Bus:
    """A mono track of the film's length that sounds are placed on by film time."""
    def __init__(self):
        self.x = np.zeros(N + SR * 4)

    def put(self, sound, at, gain=1.0):
        i = int(round(at * SR))
        if 0 <= i < N:
            self.x[i:i + len(sound)] += sound[: len(self.x) - i] * gain


CHORDS = {  # bass note, then a close voicing around middle C, in D major
    "D": (38, (57, 62, 66, 69)), "G": (43, (59, 62, 67, 71)), "A": (45, (57, 61, 64, 69)),
    "Bm": (47, (59, 62, 66, 71)), "Asus": (45, (57, 62, 64, 69)),
}


def music():
    """27 bars at 100 BPM, following the brief's section energies and hit points. Returns stereo."""
    dry, wet, drums, fx = Bus(), Bus(), Bus(), Bus()   # wet goes through the room
    T = lambda bar, beat=1.0: (bar - 1) * BAR + (beat - 1) * BEAT

    def chord(name, tr=0):
        root, tones = CHORDS[name]
        return root + tr, [m + tr for m in tones]

    def strum(bus, voice, tones, at, gain, roll=0.012, **kw):
        for i, m in enumerate(tones):
            bus.put(voice(m, **kw), at + i * roll, gain)

    # Bars 1–3 · Sunday: felt piano and a warm pad, no drums. The pad swells at 2.40.
    for bar, name, tune in ((1, "D", ((3, 78), (4, 76))), (2, "G", ((3, 79), (4.5, 78))), (3, "Asus", ((3, 76), (4, 73)))):
        root, tones = chord(name)
        strum(wet, piano, [root + 12, *tones], T(bar), 0.3, 0.03, dur=2.2, soft=0.3)
        for beat, m in tune:
            wet.put(piano(m, 1.2, soft=0.3), T(bar, beat), 0.26)
        for m in (root + 12, *tones[1:]):
            wet.put(pad(m, BAR + 0.5), T(bar), 0.06 if bar == 1 else 0.12)
    # Bars 4–5 · Monday: a colder chord, a muted ostinato, ticking 8th hats from bar 5.
    for bar, name in ((4, "Bm"), (5, "G")):
        root, tones = chord(name)
        strum(wet, piano, [root, root + 12, *tones[:3]], T(bar), 0.42 if bar == 4 else 0.28, 0.004, dur=1.6)
        for k in range(8):
            dry.put(stab(tones[(0, 2, 1, 2)[k % 4]]), T(bar) + k * 0.3, 0.34)
        dry.put(bass(root, 2.2), T(bar), 0.2)
    for k in range(8):
        drums.put(hat(), T(5) + k * 0.3, 0.22)
    # Bar 6: everything stops except a riser; the reverse cymbal peaks into the drop.
    fx.put(riser(BAR), T(6), 1.5)
    rev = cymbal(1.5)[::-1]
    fx.put(rev * np.linspace(0, 1, len(rev)) ** 2, T(7) - 1.5, 1.0)

    def groove(bar, name, tr=0, kicks=(1, 2, 3, 4), big=False, claps=(2, 4), hats="8", keys="piano", choir_=None, drive=False, level=1.0):
        root, tones = chord(name, tr)
        for beat in kicks:
            drums.put(kick(big), T(bar, beat), 1.0 if big else 0.85)
        for beat in claps:
            wet.put(clap(), T(bar, beat), 0.4 * level)
        steps = {"8": 8, "16": 16, "open": 8}[hats]
        for k in range(steps):
            off = k % (steps // 4) != 0
            drums.put(hat(hats == "open" and off and k % 2 == 1), T(bar) + k * BAR / steps, (0.2 if off else 0.1) * level)
        for beat in ((1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5) if drive else (1, 2.5, 3, 4.5)):
            dry.put(bass(root + (12 if drive and beat % 1 else 0), 0.26 if drive else 0.5), T(bar, beat), 0.5)
        if keys == "piano":
            for beat in (1, 2.5, 4):
                strum(wet, piano, tones, T(bar, beat), 0.26, 0.006, dur=0.7)
        elif keys == "rhodes":
            for beat in (1, 2.5):
                strum(dry, rhodes, tones, T(bar, beat), 0.2, 0.01, dur=1.3)
        elif keys == "drive":
            for k in range(8):
                strum(wet, piano, tones[1:], T(bar) + k * 0.3, 0.17 if k % 2 else 0.24, 0.004, dur=0.25)
        if choir_:
            for m in (tones[0], tones[2], tones[3], *((tones[1] + 12,) if choir_ == "ah" else ())):
                wet.put(choir(m, BAR + 0.15, choir_), T(bar), 0.26 if choir_ == "ah" else 0.2)

    # Bars 7–9 · Meet Jubilee, THE DROP: four on the floor, claps on 2 and 4, choir "ooh", bass.
    drums.put(cymbal(), T(7), 0.45)
    fx.put(kick(True), T(7), 1.1)
    for bar, name in ((7, "D"), (8, "A"), (9, "Bm")):
        groove(bar, name, choir_="oo")
    for i, m in enumerate((74, 76, 78, 81, 83, 86)):   # plucks: one per 8th, under the borough pins
        wet.put(pizz(m), T(9) + i * 0.3, 0.55)
    # Bars 10–12 · Why join: verse groove, kick pulled back to 1 and 3, Rhodes chords.
    for bar, name in ((10, "G"), (11, "D"), (12, "A")):
        groove(bar, name, kicks=(1, 3), keys="rhodes", level=0.7)
    # Bars 13–15 · Shop: the groove and a marimba counter-melody. Four notes name the products.
    for bar, name in ((13, "Bm"), (14, "G"), (15, "A")):
        groove(bar, name, kicks=(1, 3, 3.5), keys="rhodes", level=0.85, claps=(2, 4) if bar < 15 else ())
    for at, m, g in ((T(13, 1), 74, 0.3), (T(13, 1.5), 78, 0.25), (T(13, 2.5), 74, 0.25), (T(13, 3), 71, 0.3),
                     (T(13, 4), 78, 0.75), (T(14, 1), 79, 0.75), (T(14, 2), 81, 0.75), (T(14, 3), 83, 0.75),   # 30.60 31.20 31.80 32.40
                     (T(14, 4), 81, 0.3), (T(14, 4.5), 78, 0.25)):
        wet.put(marimba(m), at, g)
    for beat in (1, 2, 3, 4):                           # the bag fills: clap and pop on every beat of bar 15
        wet.put(clap(), T(15, beat), 0.55)
        wet.put(marimba(86 + beat, 0.3), T(15, beat), 0.4)
    # Bars 16–18 · Hire & book: the same groove, hats open up; a chime on the bar-18 downbeat.
    for bar, name in ((16, "D"), (17, "G"), (18, "A")):
        groove(bar, name, kicks=(1, 3, 3.5), keys="rhodes", hats="open", level=0.85)
    for k in range(6):                                  # the slot hops on these 8ths, 38.40–39.90
        drums.put(hat(), T(17) + k * 0.3, 0.32)
    for m, g in ((81, 0.5), (88, 0.4), (93, 0.2)):
        wet.put(bell(m), T(18), g)
    for k in range(4):                                  # a fill into the key lift
        drums.put(snare(), T(18, 4) + k * 0.15, 0.25 + 0.1 * k)
    rev = cymbal(1.0)[::-1]
    fx.put(rev * np.linspace(0, 1, len(rev)) ** 2, T(19) - 1.0, 0.4)
    # Bars 19–21 · Why list, KEY LIFT to E: full choir, a bigger kick.
    drums.put(cymbal(), T(19), 0.5)
    for bar, name in ((19, "D"), (20, "A"), (21, "Bm")):
        groove(bar, name, tr=2, big=True, choir_="ah")
    # Bars 22–24 · How to list: driving; a snare pickup at 55.20 and a roll over the last two beats.
    for bar, name in ((22, "G"), (23, "D"), (24, "A")):
        groove(bar, name, tr=2, big=True, hats="16", keys="drive", choir_="ah", drive=True)
    drums.put(snare(), T(24), 0.7)
    for k in range(8):
        drums.put(snare(), T(24, 3) + k * 0.15, 0.25 + 0.07 * k)
    rev = cymbal(1.2)[::-1]
    fx.put(rev * np.linspace(0, 1, len(rev)) ** 2, T(25) - 1.2, 0.45)
    # Bars 25–27 · Close: the FINAL HIT, then sustain and ring-out; a soft second hit at 62.40.
    root, tones = chord("D", 2)
    drums.put(kick(True), T(25), 1.2)
    drums.put(cymbal(4.0), T(25), 0.7)
    fx.put(np.sin(2 * np.pi * 41.2 * ts(2.5)) * np.exp(-ts(2.5) / 0.7), T(25), 0.6)
    strum(wet, piano, [root, root + 12, *tones, tones[1] + 12], T(25), 0.6, 0.004, dur=5.0)
    for m in (root + 12, *tones, tones[1] + 12, tones[3] + 12):
        wet.put(choir(m, 5.6, "ah") * np.exp(-ts(5.6) / 3.5), T(25), 0.3)
        wet.put(pad(m, 7.0), T(25), 0.07)
    drums.put(cymbal(2.4), T(27), 0.28)
    strum(wet, piano, [root + 12, *tones], T(27), 0.4, 0.02, dur=2.4, soft=0.3)
    wet.put(bell(tones[3] + 12), T(27), 0.22)

    # The room: one reverb for the piano, the choir, the claps and the mallets.
    t = ts(1.6)
    ir = band(rng.standard_normal(len(t)), 250, 6500) * np.exp(-t / 0.42)
    ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(wet.x) + len(ir))))
    room = np.fft.irfft(np.fft.rfft(wet.x, size) * np.fft.rfft(ir, size), size)[: len(wet.x)]
    room_r = np.roll(room, int(0.013 * SR))
    body = dry.x + drums.x + wet.x
    left, right = body + 0.33 * room, body + 0.33 * room_r
    # 12.00: everything cut except the riser, until the drop.
    t = np.arange(len(body)) / SR
    gate = 1 - np.clip((t - 11.97) / 0.03, 0, 1) * (1 - np.clip((t - 14.39) / 0.01, 0, 1))
    # 64.50–64.80: out.
    tail = 1 - np.clip((t - 64.35) / 0.43, 0, 1)
    stereo = np.stack([(left * gate + fx.x) * tail, (right * gate + fx.x) * tail], axis=1)[:N]
    return stereo / np.abs(stereo).max()


def effects():
    """Room tone, the drip, scroll ticks, stamps, pops, the tap and the notification dings. Returns mono."""
    s = Bus()
    # S01: room tone with soft chatter, out by 6.6.
    dur = 6.6; t = ts(dur)
    tone = noise(dur, 120, 1800) * 0.5
    for _ in range(7):
        syll = np.interp(t, np.arange(0, dur + 0.2, 0.19), rng.uniform(0, 1, int(dur / 0.19) + 2) ** 3)
        c = rng.uniform(350, 1400)
        tone += noise(dur, c * 0.7, c * 1.9) * syll * 1.6
    s.put(tone / np.abs(tone).max() * shape(len(t), 0.4, 0.5), 0, 0.12)
    # S02: a drip, and a scroll tick on each hi-hat 8th. Everything is cut at 12.00.
    for at in (7.55, 8.45, 9.2, 10.05, 10.8, 11.5):
        t = ts(0.16)
        s.put(np.sin(2 * np.pi * np.cumsum(820 + 900 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.035), at, 0.3)
    for k in range(8):
        s.put(noise(0.02, 1800, 5200) * np.exp(-ts(0.02) / 0.004), 9.6 + k * 0.3, 0.8)
    # Stamps, where the seal lands on the picture: a low thud and a slap of paper.
    for at in (23.0, 52.7):
        t = ts(0.4)
        s.put(np.sin(2 * np.pi * np.cumsum(58 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.11) + 0.35 * noise(0.4, 700, 3800) * np.exp(-t / 0.018), at, 1.0)
    # The bag fills: a pop on each beat of bar 15.
    for k in range(4):
        t = ts(0.1)
        s.put(np.sin(2 * np.pi * np.cumsum(420 + 700 * t / 0.1) / SR) * np.exp(-t / 0.03), 33.6 + k * 0.6, 0.45)
    # The tap on 10:00.
    t = ts(0.06)
    s.put(np.sin(2 * np.pi * 1250 * t) * np.exp(-t / 0.008) + 0.4 * noise(0.06, 2500, 7000) * np.exp(-t / 0.003), 40.2, 0.8)
    # Three notifications.
    for at in (45.9, 46.8, 47.7):
        s.put(bell(88, 0.9), at, 0.3)
        s.put(bell(95, 0.9), at + 0.09, 0.24)
    x = s.x[:N]
    t = np.arange(N) / SR
    x *= 1 - np.clip((t - 11.97) / 0.03, 0, 1) * (1 - np.clip((t - 14.4) / 0.01, 0, 1))
    return x / np.abs(x).max()


# ── The mix ──────────────────────────────────────────────────────────────────────────────────────────

def ffmpeg(*argv):
    r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", *argv], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit(r.stderr)
    return r.stderr


def lufs(path):
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", ffmpeg("-i", str(path), "-af", "ebur128=framelog=quiet", "-f", "null", "-"))[-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=Path)
    ap.add_argument("--voice", default=None)
    ap.add_argument("--keep-voice", action="store_true")
    a = ap.parse_args()
    folder, name = a.folder, a.folder.resolve().name

    if a.keep_voice:
        timing = (folder / "timing.js").read_text(encoding="utf-8")
        captions = json.loads(timing[timing.index("{"): timing.rindex("}") + 1])["captions"]
    else:
        voice = a.voice or os.environ.get("KOKORO_VOICE") or json.loads((folder / "narration.json").read_text(encoding="utf-8")).get("voice", "af_heart")
        print(f"narration, voice {voice}")
        captions = narrate(folder, voice)

    print("music")
    track = music()
    print("effects")
    sfx = effects()

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        ffmpeg("-y", "-i", str(folder / "narration.wav"), "-ar", str(SR), "-ac", "1", str(tmp / "voice.wav"))
        voice = read_wav(tmp / "voice.wav")
        voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

        rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 0.02 * np.abs(x).max()] ** 2))
        voice *= 0.16 / rms(voice)
        track *= 0.085 / np.sqrt(np.mean(track[int(14.4 * SR): int(21.6 * SR)] ** 2))   # levelled on the drop
        # The voice ducks the music 6 dB, easing over 150 ms around every caption.
        t = np.arange(N) / SR
        duck = np.ones(N)
        for c in captions:
            duck = np.minimum(duck, 1 - 0.5 * np.clip((t - c["start"] + 0.2) / 0.15, 0, 1) * np.clip((c["end"] + 0.1 - t) / 0.25, 0, 1))
        mix = track * duck[:, None] + (voice + sfx * 0.3)[:, None]

        def write(x, path, target):
            """Level to the target loudness, hold peaks under -1 dB, encode."""
            write_wav(tmp / "a.wav", x / max(1.0, np.abs(x).max()), SR)
            x = x / max(1.0, np.abs(x).max()) * 10 ** ((target - lufs(tmp / "a.wav")) / 20)
            knee = 0.7
            over = np.abs(x) > knee
            x[over] = np.sign(x[over]) * (knee + (0.89 - knee) * np.tanh((np.abs(x[over]) - knee) / (0.89 - knee)))
            write_wav(tmp / "b.wav", x, SR)
            ffmpeg("-y", "-i", str(tmp / "b.wav"), "-ac", "2", "-b:a", "256k", str(path))
            print(f"  {path.name}: {lufs(path):.1f} LUFS, peak {20 * np.log10(np.abs(x).max()):.1f} dB")

        write(track.copy(), folder / "music.mp3", -16)
        write(np.stack([sfx, sfx], axis=1) * 0.5, folder / "sfx.mp3", -24)
        write(mix, folder / f"{name}.mp3", -14)


if __name__ == "__main__":
    main()
