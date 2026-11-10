# 01 · Meet Jubilee

> **Runtime:** 0:42 · **Audience:** Toronto's Christian community, members and business owners · **Prerequisites:** none

**Video:** [01-jubilee-pitch.mp4](01-jubilee-pitch.mp4) · [Animated deck](slides.html) · **Audio:** [01-jubilee-pitch.mp3](01-jubilee-pitch.mp3) · [Transcript](script.md) · [Captions](captions.vtt)

## Why this video exists

To make people want to sign up: it shows what Jubilee is, what a member can do there and why an
owner should list, in well under a minute, using the product's own screens.

## Learning objectives

By the end, the viewer can:

- Say what Jubilee is: Toronto's Christian marketplace, a directory of verified Christian-owned businesses.
- Name the four things a member can do: message, book a meeting, ask for a quote, request a product.
- Tell that listings are confirmed by a pastor or elder, and that joining and listing are free.

## Key questions

| Question | What a strong answer includes |
|---|---|
| Why trust a listing? | Every listing is a Christian-owned business confirmed by a pastor or elder. |
| What can I do there? | Message the owner, book a meeting, ask for a quote, request a product; the business answers directly. |
| Why list my business? | It is free, and requests arrive in one place to confirm or decline. |

## Code / assets on screen

Screenshots are taken from `docs/mocks` by `build.mjs --shots` (list in [shots.json](shots.json)).

| Scene | Mocks shown |
|---|---|
| Hello Toronto | `pages/welcome` |
| The directory | `pages/browse`, `pages/category` (phone) |
| Trust | `pages/business` (Legacy Financial), `pages/shop` (Luzandre.com, phone) |
| Ask, book or order | `pages/conversation`, `dialogs/book-meeting`, `dialogs/request-quote`, `dialogs/order-request` (phones) |
| Your requests | `pages/requests`, `pages/notifications` (phone) |
| Owners | `pages/my-business`, `pages/incoming-requests` and `pages/my-products` (phones) |
| Community | a wall of the above plus `pages/product`, `pages/search`, `pages/saved`, `pages/request-detail` |

## Run sheet

| Time | Segment | Content |
|---|---|---|
| 00:00-00:02 | Intro | Music only, full level. Logo and wordmark. |
| 00:02-00:06 | Hello Toronto | "Toronto! Meet Jubilee" over the welcome page. |
| 00:06-00:12 | The directory | 47 counts up; the ten categories pop in. |
| 00:12-00:17 | Trust | Business and shop profiles; the Verified stamp lands. |
| 00:17-00:21 | Ask, book or order | Four phones drop in, one per action. |
| 00:21-00:25 | Your requests | Requests list and notifications; Confirmed, Awaiting reply. |
| 00:25-00:29 | Owners | "Own a business? List it free." over My business. |
| 00:29-00:34 | Community | A family, a church, a community. |
| 00:34-00:39 | Join | "Join free today." |
| 00:39-00:42 | Outro | Music only, full level, fading out. |

## Demo commands

```sh
python tools/video-audio/generate_audio.py docs/videos/01-jubilee-pitch
node tools/video-build/build.mjs docs/videos/01-jubilee-pitch --shots
node tools/video-build/build.mjs docs/videos/01-jubilee-pitch
```

## Pitfalls

- **The music is a stand-in.** `music.mp3` is a synthesized soca-style groove from
  `tools/video-audio/placeholder_music.py`, not a Pixabay track: Pixabay's site refuses automated
  downloads. Download a soca track from Pixabay Music, save it as `music.mp3` here (or pass
  `--music`), set `data-bpm` in `slides.html` to its tempo, and rebuild.
- Captions are off by default; see [the videos README](../README.md).
- The facts on screen (47 businesses, ten categories, the cast) come from `docs/mocks/README.md`.
  If the mocks change, re-run `--shots` and check the script.

## References

- Kokoro-82M ONNX on Hugging Face: `onnx-community/Kokoro-82M-v1.0-ONNX`
- Pixabay Music: pixabay.com/music
