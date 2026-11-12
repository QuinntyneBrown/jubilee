# Jubilee videos

One folder per video. The text files are the source; the media is generated from them.

| # | Video | Runtime | What it is |
|---|---|---|---|
| 01 | [Meet Jubilee](01-jubilee-pitch/README.md) | 1:04 | The pitch film for Toronto's Christian community: why join, what you can do, why list. Nine scenes cut to a 100 BPM grid, built from the Magic Patterns design. |
| 02 | [The Jubilee plan](02-business-plan/README.md) | 1:20 | The business plan, short: launch dates, how businesses pay, homes and stays, revenue, the raise and the roadmap. Ten picture-led scenes, narrated, no captions. |

## How a pitch film is built

```
docs/videos/NN-topic/
  slides.html        the page that plays the film                          (written)
  film.js            the scenes: markup and the functions that move it     (written)
  narration.json     the lines, their windows and the words on a beat      (written)
  script.md          the transcript                                        (written)
  README.md          outline and run sheet                                 (written)
  narration.wav      the fitted voice alone                                (generated)
  timing.js          captions and spoken segments in film seconds          (generated)
  music.mp3          the track alone                                       (generated)
  sfx.mp3            the sound effects alone                               (generated)
  captions.vtt       captions in film time, a sidecar file                 (generated)
  NN-topic.mp3       voice, effects and ducked music                       (generated)
  NN-topic.mp4       1920x1080, 60 fps, captions burned in                 (generated)
```

```sh
pip install kokoro-onnx numpy
python tools/video-audio/film_audio.py docs/videos/NN-topic                 # voice, music, effects, mix, timing.js
python tools/video-audio/film_audio.py docs/videos/NN-topic --keep-voice    # the same, reusing narration.wav
python tools/video-audio/narrated_audio.py docs/videos/NN-topic             # a film without its own score: voice and a quiet piano bed
node tools/video-build/build.mjs docs/videos/NN-topic --check               # print the schedule and the captions
node tools/video-build/build.mjs docs/videos/NN-topic --frame 22.8 f.png    # look at one frame (film seconds)
node tools/video-build/build.mjs docs/videos/NN-topic                       # captions.vtt + mp4
node tools/video-build/build.mjs docs/videos/NN-topic --no-captions --fps 30 --crf 20   # no captions, a smaller file
```

- **The builder** needs Node with Playwright (Chromium) and ffmpeg with libx264 (`FFMPEG_PATH`
  overrides). Playwright is installed in `e2e/`; run the builder with
  `NODE_PATH=e2e/node_modules` so it finds that copy. It needs no network connection: the fonts
  and photos are in the repository (see below). The full render takes several minutes
  (3,888 frames for 64.8 s).
- **The audio is a synthesized stand-in.** `film_audio.py` writes the music and the sound effects
  with numpy and speaks the narration with Kokoro-82M (`af_heart`), run locally. The design's audio
  brief asks for a composed track and a recorded voice; when those exist, replace
  `NN-topic.mp3` with the real mix (same length, same hit points) and rebuild the MP4.
  The script is specific to video 01: its score follows that film's bar-by-bar brief.
  `narrated_audio.py` reuses its narration for any other film (`bpm` and `scenes` in
  `narration.json` set the length) and lays a quiet synthesized piano bed under it.
- **Voice.** The model and voice are looked for in `KOKORO_DIR`, `.cache/kokoro` and the Hugging
  Face cache, and downloaded once from `onnx-community/Kokoro-82M-v1.0-ONNX` otherwise. Free, no
  key. `--voice` or `KOKORO_VOICE` picks another voice.
- **Captions** are burned into the MP4, as the build spec asks (for silent autoplay on the
  marketing site). `--no-captions` renders without them; `captions.vtt` is written either way. In
  the deck, the Captions button or `c` toggles them, and `slides.html?captions=0` starts without.
  A deck whose `<body>` has `data-captions="off"` starts without them (`?captions=1` shows them).
- **Size.** `--fps` and `--crf` (default 60 and 16) trade smoothness and quality for file size.

## The deck

`slides.html` loads `assets/pitch.css`, `assets/pitch.js` (the runtime) and the folder's `film.js`
(the scenes). The stage is 1920x1080. A film is a list of scenes of exactly three bars each
(7.2 s at 100 BPM; `data-bpm` on `<body>` sets the tempo), and every pixel is a pure function of
film time: the page plays live against the MP3, and the builder seeks it frame by frame through
`PITCH.seek(seconds)`. Nothing uses CSS animation or transition.

`film.js` calls `PITCH.film([{ id, build }])`. `build(S)` returns the scene's HTML; inside it:

| Helper | What it does |
|---|---|
| `S.ref((el, t) => …)` | Marks an element; the function runs on every frame with the scene-local time. |
| `S.words(at, text, { accent, accentClass, stagger })` | Masked word rise: each word slides up from behind its line, 300 ms, 50 ms stagger. |
| `S.rise(at)` | Fade and 24 px rise for supporting text and UI. |
| `S.drawnMark(size, { draw, bar })`, `S.wordmark(size, p)` | The J mark drawing itself and the "jubilee" wordmark rising letter by letter. |
| `S.wipe(p)` | The gold crossbar wipe: 0 off left, 0.5 covering, 1 off right. Marks a change of act. |
| `S.seal(size, spin)` | The "verified by the Jubilee team" seal. |
| `S.aurora(intensity, { horizon, colors })` | The WebGL aurora background. |
| `S.confetti(bursts, count)` | Canvas confetti, solved in closed form so any frame draws alone. |

`PITCH` also exposes the clock and the named curves: `b(n)` (beat n of a scene), `enter`, `exit`,
`prog`, `pulse`, `beatsBetween`, `brand`, `outBack`, `outExpo`, `inOutCubic`, `inQuart`.

Open `slides.html?guides=1` (or press `g`) for the safe areas, the timecode and the beat grid, and
`slides.html?t=22.8` to open paused on a film time.

**Fonts and photos.** Archivo is the repository's variable file with the width axis
(`docs/design-system/assets/fonts/Archivo.woff2`); headings are set at width 112. Inter is
`Inter.woff2` beside it (weights 400 to 600, Latin) and the photos are in `docs/assets/photos/`,
downloaded from the Magic Patterns design. The runtime waits for both before the first frame and
the builder stops if either fails to load.
