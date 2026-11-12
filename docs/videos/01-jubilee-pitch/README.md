# 01 · Meet Jubilee

> **Runtime:** 1:04 (64.80 s) · **Format:** 1920×1080, 60 fps · **Audience:** Toronto's Christian community, members and business owners

**Video:** [01-jubilee-pitch.mp4](01-jubilee-pitch.mp4) · [Live deck](slides.html) · **Audio:** [01-jubilee-pitch.mp3](01-jubilee-pitch.mp3) · [Transcript](script.md) · [Captions](captions.vtt)

## Why this video exists

To make people want to join and to list, framed from the mission: "Abiding in Jesus and for love of
Him, Jubilee equips Christian business people in Toronto to prosper with purpose and resource His
Kingdom." It opens on the calling (on Sunday we're sent out to bear fruit that will last, John 15:16),
shows the Monday problem (can believers find you?), then shows what Jubilee is, why to join, what a
member can do, and why and how an owner lists, in just over a minute.

## Source of truth

The film is built from the Magic Patterns project "Jubilee Christian Marketplace": the **Pitch
Video** prototype (nine scenes and their shared code) and the **Pitch Video Build Spec**. `film.js`
and `../assets/pitch.js` are a port of that source to plain HTML, CSS and JavaScript, keeping its
positions, sizes, copy, colours, timings, easing curves and transitions. Where the prototype's code
and the spec's prose differ, the code wins. Change the design in Magic Patterns first, then here.

## Run sheet

Nine scenes of three bars each at 100 BPM (1 beat = 0.6 s, 1 bar = 2.4 s, 1 scene = 7.2 s), so every
cut lands on a downbeat.

| # | Scene | Act | In | Out | What happens |
|---|---|---|---|---|---|
| 01 | Sunday | Hook | 0:00.00 | 0:07.20 | Warm church photo, slow pull-back: "On Sunday, we're sent out to bear fruit that will last." A gold line underlines "last." Colour drains in the last bar. |
| 02 | Monday | Hook | 0:07.20 | 0:14.40 | Cold kitchen photo: "you open for business. Can believers find you?" A feed of stranger search results scrolls faster, then freezes. Gold wipe. |
| 03 | Meet Jubilee | Hook | 0:14.40 | 0:21.60 | The drop: the gold slab collapses into the logo's crossbar, the J draws, the aurora pulses on the kick. "Toronto's Christian businesses, prospering with purpose." Six borough pins. |
| 04 | Why join | Why join | 0:21.60 | 0:28.80 | "Purpose, built in." The seal stamps on "God"; three reasons land with the narration: your work is a calling (Deuteronomy 8:18), business resources the Kingdom, together we strengthen our city. |
| 05 | Shop | What you can do | 0:28.80 | 0:36.00 | "Buy from believers. Shop with purpose." Four catalogue products land on the words that name them; the bag fills on every beat. |
| 06 | Hire & book | What you can do | 0:36.00 | 0:43.20 | "Hire believers who work as for the Lord." A Legacy Financial booking card: the slot hops, is tapped, and "Booked." confirms on the downbeat. |
| 07 | Why list | Why list | 0:43.20 | 0:50.40 | Key lift, gold aurora. "Own a business? Bear fruit." An owner's portrait with three notifications stacking on the beat. |
| 08 | How to list | Why list | 0:50.40 | 0:57.60 | "Three steps to a legacy." A gold line runs through create your page, welcome believers, resource the Kingdom; the seal stamps; "List your business free". |
| 09 | Close | Close | 0:57.60 | 1:04.80 | Confetti on the final hit, the logo builds, "Your business was meant to outlast you.", jubilee.to, "Resource the Kingdom. In Jesus' name.", fade to ink. |

Transitions: a gold crossbar wipe marks each change of act (02→03, 04→05, 06→07); a coloured panel
marks a change of colour inside an act (03→04, 05→06, 08→09); hard cuts are kept for 01→02 and 07→08.

## What is a stand-in

The picture follows the design. The sound does not yet: the build spec asks for things this
repository cannot produce, so `tools/video-audio/film_audio.py` synthesizes stand-ins that keep the
spec's timing.

| Part | The spec asks for | What is here |
|---|---|---|
| Music | A composed, warm gospel-pop track: felt piano, Rhodes, a small gospel choir, claps, kick, bass, marimba; supplied as stems | A numpy synthesis of those parts. The grid is exact: 100 BPM, 27 bars, D major lifting to E at bar 19, stop and riser at 12.00, drop at 14.40, marimba notes at 30.60 / 31.20 / 31.80 / 32.40, claps at 33.60–35.40, chime at 40.80, key lift at 43.20, snare pickup at 55.20, final hit at 57.60, soft hit at 62.40, out by 64.80. The timbre is synthetic, and the "choir" is a vowel synth. |
| Narration | One warm, conversational Canadian-English voice, mid-30s to 40s, recorded wild and fitted | Kokoro-82M text-to-speech, voice `af_heart` (American English), spoken phrase by phrase at the speed that fits each window. |
| Sound effects | Room tone with chatter, a drip, scroll ticks, stamp, tap, chime, notification dings | Synthesized versions of each. The room tone and drip are the weakest. |
| Loudness | −14 LUFS integrated, true peak −1 dBTP, voice ducks music 6 dB | −14.0 LUFS as measured by ffmpeg, peaks held to −1 dB before encoding (about −0.7 dB after MP3 encoding), music ducked 6 dB under the voice. True peak is not measured, and there are no stems beyond `music.mp3` and `sfx.mp3`. |

Other things to know:

- **Narration pace.** The spec asks for about 150 words a minute, but several of its windows need
  more than 200. The windows win, so those lines are spoken fast.
- **Hard syncs are approximate.** "God" (22.80), "Bibles" (30.60) and "gifts" (31.20) start their
  phrases, so they land exactly. "flowers" (32.40) and "tap" (40.20) are placed by estimate,
  because the voice model gives no word timings; expect them within about a tenth of a second.
- **Stamp sounds follow the picture.** The spec's hit table puts the stamp at 22.80 and 52.20; in
  the prototype's code the seal starts to fall then and lands at 23.00 and 52.70, so the thud is
  there.
- **Photos and Inter are in the repository.** The five scene photos and the catalogue images are
  in `docs/assets/photos/` and Inter in `docs/design-system/assets/fonts/`, so the deck and the
  builder work offline. The photos are AI-generated placeholders for a shoot.
- **Departures from the prototype's code**, each for a fault it has when run or for the house rules
  on Scripture (`docs/scripture.md`):
  - Scene 02: "On Monday," is held on one line and the search bar stays above the scrolling
    results. "Can believers find you?" wraps as the design has it; held on one line it ran under
    the search feed.
  - The seal is built in `film.js`, not taken from the shared runtime, which still carries the old
    ring text. The design's ring text at its 2.1 letter-spacing runs past the circle and cuts
    "NAME" short, so the text is fitted to the ring (`textLength`).
  - Scene 04 quotes Deuteronomy 8:18 in the words of `docs/scripture.md`: "It is he who gives you
    power to get wealth." (the design has "the ability to produce wealth"). The narration says
    "God gives us the power to get wealth." to match.
  - Scene 06 says "who work as for the Lord", the wording of Colossians 3:23 in
    `docs/scripture.md` (the design has "as unto the Lord"), on screen and in the narration.
  - Narration windows: scene 04's first phrase starts at 22.80 rather than 22.00, so "God" lands on
    the stamp; scene 07 carries more words than before and runs to about 47.4 rather than 46.80,
    still well before the cut at 50.40.
  - The departure that set scene 08's call to action 32 px lower is gone: the design now leaves
    24 px under the steps, and the call to action no longer covers step three.
- **Captions are burned in**, one caption per sentence or phrase rather than one per line, so each
  fits on one row.

## Copy to confirm before release

The designer flagged these as made up: "Pastor Ruth", "Grace Church" and "12 people" in scene 07,
and the "Thursday, March 14" date in scene 06. Product names and prices come from the app's sample
catalogue. The narration wording is a first draft, and the two Scripture departures above want the
designer's agreement.

## Not changed here

This update brought the film in line with the design and touched nothing outside this folder. Still
to do elsewhere:

- The marketing site's chapters (`frontend/projects/marketing/src/app/content.ts`, the
  `marketing-home` mocks, L2-184 AC3 and `e2e/tests/marketing-home.spec.ts`) still call 0:21
  "Finding someone you can trust", which no longer fits scene 04. Renaming it is a change to the
  site's behaviour: requirement, mock and test first.
- The film still (`docs/assets/photos/film-still.jpg`) may want a frame from the new opening.
- The shared seal (`S.seal` in `../assets/pitch.js`) and its description in `../README.md` still say
  "verified by the Jubilee team".
- The marketing build copies this MP4 to `media/jubilee-pitch.mp4` and picks up the new film at its
  next build.

## Rebuild

```sh
python tools/video-audio/film_audio.py docs/videos/01-jubilee-pitch
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/01-jubilee-pitch --check
NODE_PATH=e2e/node_modules node tools/video-build/build.mjs docs/videos/01-jubilee-pitch
```

See [the videos README](../README.md) for the files, the flags and the deck's helpers.

## Checks worth repeating after a change

- Frames at 14.40, 22.80–23.00, 30.60–32.40, 40.20, 40.80, 43.20 and 57.60 show their event on the
  frame where the sound starts (`--frame <seconds> out.png`, or `slides.html?guides=1&t=<seconds>`).
- Every word sits inside title safe (5% inset) and nothing is under 18 px.
- No narration runs into the first 0.3 s of the next scene (`--check` prints the caption times).

## References

- Magic Patterns project: magicpatterns.com/os/vjQEdxvHPvuznVPfxRXYfe (Pitch Video, Pitch Video Build Spec)
- Kokoro-82M ONNX on Hugging Face: `onnx-community/Kokoro-82M-v1.0-ONNX`
