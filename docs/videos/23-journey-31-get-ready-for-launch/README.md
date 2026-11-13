# 23 · Journey 31: Get ready for launch

> **Runtime:** 2:58 (178.3 s) · **Format:** 1920×1080, 30 fps, captions burned in · **Audience:** the repository owner and reviewers of journey 31

**Video:** [23-journey-31-get-ready-for-launch.mp4](23-journey-31-get-ready-for-launch.mp4) · **Audio:** [23-journey-31-get-ready-for-launch.mp3](23-journey-31-get-ready-for-launch.mp3) · [Transcript](script.md) · [Captions sidecar](captions.vtt)

## What it shows

The run of `docs/prompts/31-get-ready-for-launch.md`, which gave every criterion of `L2-215` to
`L2-218` a passing test and gave the owner one checklist of the launch settings (ADR 0061). The
video is filmed on the marketing site (`:4201`) in its launching-soon state (ADR 0044), each state
opened by its route key (`site: 'marketing'`) and answered from the recorded API and the launch
stubs the behaviour specs use (ADR 0009). The top bar's "Launching soon" and the opening's label
(`L2-215` AC1, AC2); "Tell me when it launches" moves to the launch notification (AC3). The launch
notification sent empty lists what to fix (`L2-217` AC2), is busy while it is sent (AC3), says
"Still sending." instead of an error and then confirms (AC4, AC6), and says when to try again
past the limit (AC7). The business pre-registration shows the fields the server refused, with the
summary (`L2-216` AC3, new), says when the bot challenge was not passed (AC8) and confirms (AC5).
Cards say what the new tests prove behind the proxy (`L2-218` AC3, `LaunchTests.cs`,
`server.test.js`), for the CLI and the daily job (AC4, AC6, `LaunchCommandTests.cs`,
`LaunchRetentionJobTests.cs`), show the owner's checklist in `eng/azure/README.md`, and say what
is left for the owner.

## Run sheet

| # | Scene | In | Out | Picture |
|---|---|---|---|---|
| 01 | `intro` | 0:00 | 0:20 | Card: "Journey 31 · Get ready for launch" |
| 02 | `page` | 0:21 | 0:34 | The opening: "Launching soon" in the top bar and above the heading; "Tell me when it launches" moves to the form |
| 03 | `invalid` | 0:34 | 0:43 | The launch notification sent empty: "Fix 2 things to continue" |
| 04 | `busy` | 0:43 | 0:54 | Joanna's address typed, the box ticked, the button busy and the fields read-only |
| 05 | `retrying` | 0:54 | 1:10 | "Still sending." and then "You’re on the list." |
| 06 | `limited` | 1:12 | 1:21 | "You’re doing that a lot. Try again in 42 minutes." |
| 07 | `server` | 1:23 | 1:38 | "Be listed on launch day.": "Choose a category." and "Enter a web address…" from the server |
| 08 | `challenge` | 1:40 | 1:53 | "We couldn’t check that you’re not a robot. Wait a moment and try again." |
| 09 | `success` | 1:55 | 2:04 | "Thank you. We have your details." |
| 10 | `proxy` | 2:04 | 2:18 | Card: "Proved behind the proxy" |
| 11 | `cli` | 2:18 | 2:33 | Card: "Read with the CLI, deleted on time" |
| 12 | `checklist` | 2:33 | 2:46 | Card: "The owner's checklist" |
| 13 | `close` | 2:46 | 2:57 | Card: "Left to the owner" |

## Rebuild

```sh
pip install edge-tts
node tools/video-demo/build.mjs docs/videos/23-journey-31-get-ready-for-launch --check   # speak the lines, print their lengths
node tools/video-demo/build.mjs docs/videos/23-journey-31-get-ready-for-launch           # record and encode
```
