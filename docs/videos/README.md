# Jubilee videos

One folder per video. The text files are the source; the media is generated from them.

| # | Video | Runtime | What it is |
|---|---|---|---|
| 01 | [Meet Jubilee](01-jubilee-pitch/README.md) | 0:42 | Narrated, animated pitch for Toronto's Christian community: why join, what you can do, why list. |

## How a pitch video is built

```
docs/videos/NN-topic/
  script.md        narration, one `##` section per scene            (written)
  slides.html      the animated deck, one <section> per scene        (written)
  shots.json       which mocks to screenshot for the deck            (written)
  README.md        outline and run sheet                             (written)
  music.mp3        background track                                  (supplied)
  shots/           mock screenshots                                  (generated)
  narration.wav    Kokoro narration                                  (generated)
  timing.js        start and end of every sentence                   (generated)
  captions.vtt     captions in video time, a sidecar file            (generated)
  NN-topic.mp3     narration mixed over the music                    (generated)
  NN-topic.mp4     1920x1080, 30 fps                                 (generated)
```

```sh
pip install kokoro-onnx soundfile numpy
python tools/video-audio/generate_audio.py docs/videos/NN-topic --dry-run   # validate script, estimate length
python tools/video-audio/generate_audio.py docs/videos/NN-topic             # narration.wav + timing.js
node tools/video-build/build.mjs docs/videos/NN-topic --shots               # screenshot the mocks
node tools/video-build/build.mjs docs/videos/NN-topic --check               # resolve cues, print the schedule
node tools/video-build/build.mjs docs/videos/NN-topic --frame 12.5 f.png    # look at one frame
node tools/video-build/build.mjs docs/videos/NN-topic                       # mp3 + captions.vtt + mp4
```

- **Voice.** Kokoro-82M (`af_heart`, speed 1.1), downloaded once from Hugging Face
  (`onnx-community/Kokoro-82M-v1.0-ONNX`) into `.cache/kokoro` and run locally. Free, no key.
  `--voice` or `KOKORO_VOICE` picks another voice; `pronunciations.json` holds spoken replacements.
- **Music.** `music.mp3` in the folder, or `--music <file>`. It plays at full level through the
  music-only intro and outro and is ducked under the narration. The builder measures the track and
  sets its level, so a quiet or a loud track mixes the same. Set `data-bpm` to the track's tempo
  and `data-music-start` to a downbeat in it, and the beat pulses land on the beat.
  `tools/video-audio/placeholder_music.py` synthesizes a stand-in groove until a track is chosen.
- **Captions** are off by default: the MP4 has none, `captions.vtt` is a sidecar, and the deck has a
  Captions button (or press `c`, or open `slides.html?captions=1`). `--burn-captions` burns them in.
- The builder needs Node with Playwright (Chromium) and ffmpeg with libx264 (`FFMPEG_PATH` overrides).

## The deck

`slides.html` loads `assets/pitch.css` and `assets/pitch.js`. The stage is 1920x1080 and every pixel
is a function of the clock, so the page plays live against the MP3 and the builder renders it frame
by frame. The background is a WebGL fragment shader; confetti and the wipe between scenes are drawn
on a 2D canvas.

On `<body>`: `data-intro` and `data-outro` (seconds of music before and after the narration),
`data-bpm` (the music's tempo, for beat pulses), `data-music-start` (seconds into the track where
the video begins; the beat pulses count from there, so make it a downbeat) and `data-audio`.

On a `<section>`: `data-cue`, the first words of the sentence in `script.md` that starts the scene.
The first section has no cue and covers the intro.

On any element inside a section:

| Attribute | Meaning |
|---|---|
| `data-in` | Entrance: `pop`, `stamp`, `up`, `left`, `right`, `rise`, `drop`. |
| `data-sentence` | Enter when the nth sentence after the cue starts (0 is the cue sentence). |
| `data-at`, `data-dur` | Seconds after that moment, and how long the entrance takes. |
| `data-rot`, `data-tilt="x,y"` | Resting rotation and 3D tilt in degrees. |
| `data-float`, `data-beat`, `data-drift="x,y"` | Idle bob in px, pulse on the beat, steady travel in px/s. |
| `data-count` | Count up to this number. |
