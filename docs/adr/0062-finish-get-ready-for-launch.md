# 0062. Finish get ready for launch: one checklist of the launch settings, and the limits counted per visitor behind the proxy

## Status

Accepted, 12 November 2026. Applies ADR 0044 (launching soon), ADR 0047 (launch forms never lose a
submission) and ADR 0040 (the proxy key).

## Context

Journey 31 (get ready for launch) was recorded at 95%. An audit of `L2-215` to `L2-218` against
the tests found every state of the two forms tested with stubbed answers, and four things without
a test:

- the forms with a bot challenge configured: that the token is sent, that no challenge is loaded
  without a site key, and that a refused token is replaced by a fresh one (`L2-216` AC8,
  `L2-217` AC7, `L2-218` AC5);
- a 422 for a field that the server finds and the page does not, and a send that is not answered
  within 10 seconds or cannot be made at all (`L2-216` AC3, AC6, `L2-217` AC2, AC6);
- the limits of 5 an hour counted per visitor behind the marketing host: two visitors through the
  same proxy, and a caller that states its own address (`L2-218` AC3);
- the CLI with nothing stored (`L2-218` AC4).

`eng/azure/README.md` described the settings of the forms as prose spread over several bullets, and
said there was nothing to run by hand. The deployment applies them (ADR 0047), but the owner had
no single list to check, in order, that production is set and that a submission reaches the
database.

## Decision

- **One ordered checklist.** "The launching-soon forms" in `eng/azure/README.md` is a numbered
  list: the migrations, the proxy key, the four settings of the marketing host, the team's
  address, the deployment's own check, a submission of each form, reading it back with the CLI,
  and the bot challenge when it is turned on. Each step gives the command that checks it (an
  `az`, `curl` or `jubilee` command that prints names and counts, never a secret or personal
  data) and the command that sets it by hand if a deployment did not. The deployment still
  applies every setting; the list is how the owner proves it. No agent runs it.
- **The address of a limit is the visitor's.** `L2-218` AC3 now says so: behind the marketing
  host it is the address the proxy states with its key, and a caller's own statement is not
  believed. This was the behaviour already; it is now a criterion with tests on both sides of the
  proxy (`LaunchTests.cs`, `server.test.js`).
- **The bot challenge is tested against a stand-in for Cloudflare's script.** The stand-in the
  join form's spec used moves to `e2e/fixtures/bot-challenge.ts` and serves the join form and the
  two launch forms. No test reaches Cloudflare.
- **The CLI's output is the export.** `jubilee launch list` writes CSV to standard output, so
  `> file.csv` exports it; with nothing stored it prints the header row alone and audits
  `0 rows` (`L2-218` AC4). No file option is added.

## Consequences

- Every criterion of `L2-215` to `L2-218` has a passing test. Journey 31 is at 100%; submitting
  each form once in production and reading it back is the owner's last check, listed in the
  checklist.
- When Jubilee opens, the checklist goes with the launching-soon settings (ADR 0044).
