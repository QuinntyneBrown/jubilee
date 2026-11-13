# 29 · Journey 24: Use Jubilee offline

> **Runtime:** 1:37 · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 24

**Video:** [29-journey-24-use-jubilee-offline.mp4](29-journey-24-use-jubilee-offline.mp4) · **Audio:** [29-journey-24-use-jubilee-offline.mp3](29-journey-24-use-jubilee-offline.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/24-use-jubilee-offline.md`, which took journey 24 from 83% to 99%
(`L2-119` to `L2-122`, ADR 0068). It is recorded against the production build of the app, with
its service worker, served on port 4203 by `eng/azure/server.js`.

Joanna, a member, has opened a conversation with Legacy Financial and the browse home. The device
loses its connection and the page is loaded again: Jubilee still opens, from the app shell the
service worker keeps, with the directory saved at 9:00 a.m. under "You’re offline. Showing the
directory saved at 9:00 a.m. Search and messages will work again when you’re connected.", and the
search box disabled (`L2-119` AC1 to AC4). Still offline, the conversation opens from what was
saved; a message written now shows "Waiting to send" (`L2-120` AC1). When the connection returns
it is sent, and the banner reads "You’re back online. 1 saved message was sent." (AC2). A card
says what Background Sync does while Jubilee is closed (AC5). On a slow connection the banner
reads "Your connection is slow. Pages may take longer to load.", a save still sending shows "Still
sending your request" and goes through when the connection answers (`L2-121` AC4, AC5). Joanna
signs out. Two cards say what the tests prove behind the screen and what is left for the owner.

## What the pictures prove, and what only the tests prove

The API is answered by the recording and the stand-ins of the behaviour specs (ADR 0009). The
recorder's browser does not report its emulated network to the page, so the demo tells the page,
through `navigator.onLine`, what a phone's browser would tell it; the network itself is cut at the
browser context, the service worker included. The slow scenes shorten the waits (a mean above one
second, the warning after two and a half) so they fit the film; the app's own are 3 and 5 seconds.

The pictures prove what the browser does: the app opening from the service worker's cache with no
network, the saved directory and conversation, the queued message and its delivery, the slow
banner and toast, and the sign-out.

Only the tests prove the rest:

- that Background Sync sends the queue while Jubilee is closed, in order and with the idempotency
  key, and that a message the worker sent is never sent again by an open page
  (`e2e/tests/offline-installed.spec.ts`, `L2-120` AC5). Said on a card;
- that signing out leaves no saved page and no queued message on the device
  (`e2e/tests/offline.spec.ts`, "signing out", `L2-119` AC3). Said in the narration;
- that the service worker leaves every `/api` request to the network, so no answer of the API is
  kept by it: in `offline-installed.spec.ts` the worker controls the page while every `/api`
  request is still answered by the page's own mocking. Said on a card. And that `server.js` serves
  the worker's files with `no-cache` (`eng/azure/server.test.js`);
- that a message waiting more than 24 hours is marked "Not sent" (`L2-120` AC3), that the waits
  between attempts to reach Jubilee are 5, 10, 20, 40 and then 60 seconds (`L2-121` AC3), and that
  a request never answered fails when the minute of trying is over (`L2-121` AC5). On a card;
- that the banner is a polite live region and takes no focus (`L2-067` AC3).

What remains is the owner's: the address of a status page hosted apart from Jubilee, for "Check
status" (`environment.statusUrl`, `eng/azure/README.md`).

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:13 | Card: "Journey 24 · Use Jubilee offline" |
| 02 | `shell` | 0:14 | 0:27 | Loaded again with no connection: the saved directory and "You’re offline." (`L2-119`) |
| 03 | `queue` | 0:28 | 0:37 | The saved conversation; the new message "Waiting to send" (`L2-120` AC1) |
| 04 | `back` | 0:39 | 0:47 | "You’re back online. 1 saved message was sent." (AC2) |
| 05 | `sync` | 0:47 | 0:54 | Card: Background Sync (AC5) |
| 06 | `slow` | 0:58 | 1:08 | "Your connection is slow." and "Still sending your request" (`L2-121` AC4, AC5) |
| 07 | `signout` | 1:10 | 1:18 | Sign out of Jubilee (`L2-119` AC3) |
| 08 | `behind` | 1:18 | 1:29 | Card: what the tests prove |
| 09 | `close` | 1:30 | 1:37 | Card: the owner’s step, the status page |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/29-journey-24-use-jubilee-offline --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/29-journey-24-use-jubilee-offline           # record and encode
```

`narration.json` holds the lines and `demo.spec.ts` drives the app, one `demo.scene` per line. The
builder and its helpers are described in [`../README.md`](../README.md), "How a demo video is
built". The recording builds the app for production first (the `installedAppServer` of
`e2e/playwright.config.ts`).
