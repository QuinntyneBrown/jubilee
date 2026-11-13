# 02 · The Jubilee plan

> **Runtime:** 1:20 (80.00 s) · **Format:** 1920×1080, 30 fps, no captions · **Audience:** investors, partners and founding businesses

**Video:** [02-business-plan.mp4](02-business-plan.mp4) · [Live deck](slides.html) · **Audio:** [02-business-plan.mp3](02-business-plan.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## Why this video exists

The short version of the business plan: what Jubilee is, when it launches, how businesses pay, the
two housing products that follow (long-term rentals, then short-term and monthly stays), the revenue
it grows to, the raise and the roadmap. It is built for watching with sound: a voice over pictures,
with a number, a date or a two-to-four word label on screen and no captions burned in.

## Run sheet

Ten scenes of three bars each at 90 BPM (1 bar = 2.67 s, 1 scene = 8.0 s).

| # | Scene | In | Out | Picture | On screen |
|---|---|---|---|---|---|
| 01 | Toronto | 0:00 | 0:08 | `toronto-dusk` full bleed, slow push | Who can we trust? |
| 02 | Dealing honestly | 0:08 | 0:16 | `vouch` with `owner`, `plumbing`, `roofing`, `law` tiles; the seal stamps | Christian-owned. Dealing honestly. |
| 03 | Find, message, book | 0:16 | 0:24 | `flowers`, `film-still`, `advisor` as three full-height panels | Find · Message · Book · Pay the business directly |
| 04 | Launch | 0:24 | 0:32 | `sunday` full bleed | Beta · Feb 1 · 200 founding businesses · April 6, 2027 |
| 05 | How businesses pay | 0:32 | 0:40 | `mug`, `owner`, `roofing` as three panels | Basic Free · Plus $29 · Pro $79 · Founding businesses: Plus free |
| 06 | Homes | 0:40 | 0:48 | Drawn: an evening street, an apartment block, a bay-and-gable house and semis; windows light up; a key tag drops | Homes · Sept 2027 · Rooms · Apartments · Sublets · $39 |
| 07 | Stays | 0:48 | 0:56 | Drawn: a guest room at night, the city through the window; a suitcase rolls in | Stays · May 2028 · Nights · Months · 11% |
| 08 | Growth | 0:56 | 1:04 | `toronto-dusk`, darkened; revenue rises as gold towers out of the lake | Revenue · $35k → $3.1M, 2027–2031 · Break-even |
| 09 | Raise and roadmap | 1:04 | 1:12 | `roofing` (the skyline behind), darkened; a gold line through six dates | $750k Pre-seed · Feb 2027 Beta → 2030 Beyond Toronto |
| 10 | Close | 1:12 | 1:20 | The aurora; the J mark draws and the wordmark rises | jubilee · April 6, 2027 |

A gold crossbar wipe marks 01→02, 04→05, 06→07 and 08→09; the other cuts are hard. The film fades
up from ink and out to ink.

## The plan's figures (CAD)

The narration and the screen use these and nothing else; change them here and in `film.js`
and `narration.json` together.

| Item | Figure |
|---|---|
| Founding-business beta | Monday 1 February 2027, 200 founding businesses |
| Public launch | Tuesday 6 April 2027, the week after Easter |
| Business plans | Basic listing free forever; Jubilee Plus $29/month; Jubilee Pro $79/month; founding businesses get Plus free for their first year |
| Homes (long-term rentals) | September 2027; rooms, apartments, sublets; free for renters; landlords $39 per 30-day listing or $49/month for 3+ units |
| Short-term and monthly stays | May 2028; booked and paid through Jubilee; 11% take rate (8% guest + 3% host) |
| Revenue | 2027 $35k · 2028 $0.29M · 2029 $0.93M · 2030 $1.87M · 2031 $3.12M; break-even 2030 |
| Raise | $750k pre-seed (Q1 2027), $1.5M seed (Q2 2028) |
| Roadmap | Feb 2027 beta → Apr 2027 launch → Sep 2027 homes → May 2028 stays → 2029 Jubilee Pay and events → 2030 beyond Toronto |

Left out of the short film for time: the $49 multi-unit rate, the 8% + 3% split, the seed round,
members and businesses listed, promoted placements, and the principal-residence and City of
Toronto registration rules the stays product respects.

## Pictures

- **Photos** are the repository's own, from `docs/assets/photos/` (the AI-generated placeholders
  downloaded from the Magic Patterns design; see video 01). `roofing` and `owner` each appear twice.
- **Homes and stays are drawn** in `film.js` as inline SVG in the Jubilee palette (ink, cream, gold,
  emerald, teal). Freely licensed housing photos were the first choice, but this build had no
  network access to Unsplash, Pexels, Pixabay or Wikimedia Commons, so no outside photo is used.
  To swap one in, add it to `docs/assets/photos/` with its source and licence noted here.
- No other company's branding is drawn or named; the product is "short-term and monthly stays".

## Sound

- **Voice:** Kokoro-82M, `af_heart`, run locally, each phrase at the slowest speed that fits its
  window (1.0 for most; 1.1 to 1.2 for four phrases in scenes 04 to 07).
- **Music:** a quiet synthesized piano-and-pad bed (D, Bm, G, A, one chord a bar at 90 BPM), about
  20 dB under the voice and ducked a further 6 dB while it speaks. `--no-music` leaves it out.
- **Mix:** −14 LUFS, peaks under −1 dB.

## Rebuild

```sh
pip install kokoro-onnx numpy
python tools/video-audio/narrated_audio.py docs/videos/02-business-plan                 # narration.wav, timing.js, music.mp3, mix
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/02-business-plan --check
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/02-business-plan --frame 47 f.png
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/02-business-plan --no-captions --fps 30 --crf 20
```

30 fps and CRF 20 keep the file near 21 MB; the render takes about seven minutes. The deck opens
without captions (`data-captions="off"`); `slides.html?captions=1` or `c` shows them.

## Checks worth repeating after a change

- Frames at 6, 14, 22.5, 31, 39.5, 47, 55, 62, 71 and 76 s: no text crosses a panel edge or another
  label, and every word sits inside title safe.
- No narration runs into the next scene (`--check` prints the spoken times).
- The wordmark is lowercase "jubilee" in Archivo 700 at 110% width and −0.03em tracking.
