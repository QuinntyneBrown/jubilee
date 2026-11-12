# Jubilee videos

One folder per video. The text files are the source; the media is generated from them.

| # | Video | Runtime | What it is |
|---|---|---|---|
| 01 | [Meet Jubilee](01-jubilee-pitch/README.md) | 1:04 | The pitch film for Toronto's Christian community: why join, what you can do, why list. Nine scenes cut to a 100 BPM grid, built from the Magic Patterns design. |
| 02 | [The Jubilee plan](02-business-plan/README.md) | 1:20 | The business plan, short: launch dates, how businesses pay, homes and stays, revenue, the raise and the roadmap. Ten picture-led scenes, narrated, no captions. |
| 03 | [Journey 1: Discover businesses](03-journey-01-discover-businesses/README.md) | 2:39 | The demo of journey 1: a visitor goes from the welcome page to the browse home and a filtered, sorted category, and three cards say how the directory read cache is cleared and proved (ADR 0003). Twelve narrated scenes recorded from the app. |
| 04 | [Journey 3: Search the directory](04-journey-03-search-directory/README.md) | 2:51 | The demo of journey 3: a member searches from the top bar, reads the grouped results, the no-results state and the empty search page, and sees a paused listing leave the next search; three cards say why search has no indexing job and how that is proved (ADR 0011). Twelve narrated scenes recorded from the app. |
| 05 | [Journey 2: view a business and its products](05-journey-02-view-business-and-products/README.md) | 1:20 | A demo of the implementation: the sold-out card, the owner's sold-out toast, the back-in-stock notice in the app and by e-mail, and the preview status. Eight scenes of screenshots of the running app, narrated, no captions. |
| 06 | [Journey 5: Sign in and out](06-journey-05-sign-in-and-out/README.md) | 3:13 | The demo of journey 5: a visitor is brought back to the message or the save they started, a member's message survives the end of the session and is restored after signing in, and the account page signs the other devices out. Four cards say what was proved behind the screen: where a draft is kept, the single session-expired redirect and the `__Host-` cookie with no other origin approved. |
| 07 | [Journey 7: Book a meeting](07-journey-07-book-a-meeting/README.md) | 2:47 | The demo of journey 7: an owner sets meeting hours on My services (the days, from and until in Toronto time, and how often a time is offered), and a member is offered only the times inside them. Three cards say what was proved behind the screen: the rules the API enforces, the two criteria of booking that gained a test, and what is left for the owner. |

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

## How a demo video is built

A demo video shows a finished piece of work in the app itself: a voice explains while the screen is
driven, over a quiet piano bed. Each journey prompt in `docs/prompts/` ends with one.

```
docs/videos/NN-topic/
  narration.json     the lines: { "title", "scenes": [{ "id", "say" }] }        (written)
  demo.spec.ts       drives the app, one demo.scene(id, …) per line           (written)
  README.md          what the video shows and its run sheet                    (written)
  script.md          the transcript                                            (generated)
  captions.vtt       captions in film time, a sidecar file                     (generated)
  NN-topic.mp3       voice and ducked music                                    (generated)
  NN-topic.mp4       1920x1080, 30 fps, captions burned in                     (generated)
```

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/NN-topic --check             # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/NN-topic                     # record and encode
node tools/video-demo/build.mjs docs/videos/NN-topic --keep-recording    # encode again from the last recording
```

- **The voice** is edge-tts (`en-CA-ClaraNeural`; `"voice"` and `"rate"` in `narration.json` change
  it). It is free and needs the network. Each line is kept in `.cache/video-demo/` by what it says,
  so an unchanged line is not spoken again.
- **The recording** is `demo.spec.ts`, run by Playwright under `e2e/playwright.demo.config.ts`. It
  is not a test and `npm test` never runs it. It imports `test` from `e2e/fixtures/demo.ts` and the
  page objects from `e2e/pages/`; the app is answered from the recorded API and the stubs, as in
  every spec (ADR 0009), so a demo shows only what a behaviour spec can reach.
  `demo.scene(id, actions)` runs the actions and then waits until the line has been said;
  `demo.click`, `demo.type`, `demo.point` and `demo.scroll` move a visible pointer;
  `demo.card(title, lines)` covers the page with a card for the opening, the close and work that
  has nothing to show on a screen, and `demo.hideCard()` removes it. `demo.jb` opens screens by
  route key and `demo.page` is the page.
- **The music** is the piano bed of video 02 (`02-business-plan/music.mp3`), looped, turned down
  under the voice and faded out. `"music"` in `narration.json` names another file; `--no-music`
  leaves it out.
- **Captions** are burned in (`--no-captions` leaves them out); `captions.vtt` is written either way.

### A demo built from screenshots (video 05)

Video 05 was made without `tools/video-demo`, and is a film of the other kind: a deck
(`film.js`) that shows **screenshots of the running app** in drawn frames, with close-ups, built by
`tools/video-build`. New demos use the recorder above. This way still works, and suits a demo that
must show something no screen recording reaches, such as an e-mail or the same state on a phone
and a desktop side by side.

```
docs/videos/NN-journey-NN-topic/
  shots.ts           which states of the app to open and what to save      (written)
  shots/             the screenshots, PNG at double density                (generated, committed)
  email.txt          the body of an e-mail the journey sends, if any       (written)
  film.js, slides.html, narration.json, script.md, README.md               (written, as for any film)
```

```sh
V=docs/videos/NN-journey-NN-topic
# 1. An e-mail the journey sends, rendered by the backend's own layout (skip when there is none).
dotnet build backend/src/Jubilee.Application -c Release
dotnet fsi tools/video-record/render-email.fsx "<subject>" $V/email.txt $V/shots/email.html "<unsubscribe url>"
# 2. The screenshots: opens the app in Chromium and runs shots.ts.
JB_VIDEO_DIR=$V NODE_PATH=e2e/node_modules e2e/node_modules/.bin/playwright test -c tools/video-record/playwright.config.ts
# 3. Voice and the quiet piano bed, then the film.
python tools/video-audio/narrated_audio.py $V
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --check
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --frame 27 f.png
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs $V --no-captions --fps 30 --crf 23
```

- **`shots.ts`** is written with the fixtures and page objects of `e2e/`: it imports `test` from
  `e2e/fixtures/jb-test.ts`, opens states by their key in `e2e/fixtures/routes.ts` (`jb.open`) or
  with a stub of `e2e/fixtures/`, and saves pictures with `shot`, `detail` and `bringToTop` from
  `tools/video-record/shots.ts`. `test.use(DESKTOP)` is a 1280×800 window and `test.use(PHONE)` a
  390×780 one, both at double density. `jb.goto` does not sign anyone in: call
  `jb.signInAs('member')` first, or use a stub that answers the session.
- **It is not a test run and not a sweep.** `tools/video-record/playwright.config.ts` only borrows
  Playwright to drive Chromium: it never sets `JB_SWEEPS`, `JB_BASELINE` or `JB_PARITY`, compares
  nothing, and is not part of `npm test`. Every `/api` request is answered from the recording or a
  stub, as in the behaviour specs (ADR 0009). It starts `npm start` in `frontend/` unless the app is
  already on `http://localhost:4200`.
- **The film** shows each picture in a frame drawn by `film.js` (`browser`, `phone`, `closeUp` in
  video 05) with a headline and the requirement it shows. A close-up is a `detail` shot enlarged:
  that is what makes small text readable at 1080p. Keep scenes at three bars; 72 BPM gives 10 s a
  scene, room for two sentences.
- **Say only what the branch does.** The narration uses the words of `docs/specs/` and follows
  `docs/scripture.md`; if it quotes the mission, it quotes it word for word. Name in the film's
  README what the pictures prove and what only the tests prove.
- **Size.** PNG screenshots are small (about 1.6 MB for video 05), and frames that hold still
  compress well: `--fps 30 --crf 23` gives about 6 MB for 80 s. Do not let a frame drift for a
  whole scene; it doubles the file. A demo's folder has a `.gitignore` for `narration.wav` and
  `music.mp3`, which `narrated_audio.py` writes again. Keep what is committed under about 15 MB.
- **Check before publishing:** `ffprobe` for 1920×1080 H.264 with audio and the expected length,
  and look at one frame per scene.

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
