import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, Request, Route } from '@playwright/test';

/**
 * Playwright API mocking (ADR 0009): the suite never reaches the API or a database. Every
 * `/api/**` request is answered from `api/responses.json`, recorded from the seeded e2e API by
 * `npm run record-api`. A request without a recorded answer fails the test that made it.
 */

/** One recorded answer: the status and the JSON body (null for none). */
export interface RecordedAnswer {
  status: number;
  body: unknown;
}

export const responsesFile = join(__dirname, 'api', 'responses.json');
const shardsDir = join(__dirname, 'api', '.recording');

/** True while `npm run record-api` runs the suite against the real e2e API. */
export const RECORDING = process.env['JB_RECORD_API'] === '1';

let recorded: Record<string, RecordedAnswer> | undefined;
const fresh: Record<string, RecordedAnswer> = {};

function answers(): Record<string, RecordedAnswer> {
  recorded ??= existsSync(responsesFile)
    ? (JSON.parse(readFileSync(responsesFile, 'utf8')) as Record<string, RecordedAnswer>)
    : {};
  return recorded;
}

/** The key of a request: its method, path and query, as the app sends them. */
export function keyOf(method: string, url: string): string {
  const { pathname, search } = new URL(url);
  return `${method} ${pathname}${search}`;
}

/** No recorded answer: the request is named so the recording can be refreshed. */
export class NotRecorded extends Error {
  constructor(readonly key: string) {
    super(`No recorded API answer for "${key}". Run \`npm run record-api\` (ADR 0009).`);
  }
}

/**
 * The recorded answer for `route`'s request, or for `url` instead when given. While recording,
 * the real API answers and the answer is kept.
 */
export async function recordedAnswer(route: Route, url?: string): Promise<RecordedAnswer> {
  const request = route.request();
  const key = keyOf(request.method(), url ?? request.url());
  if (RECORDING) {
    const response = await route.fetch(url ? { url } : undefined);
    const text = await response.text();
    const answer = { status: response.status(), body: text ? JSON.parse(text) : null };
    fresh[key] = answer;
    return answer;
  }
  const answer = answers()[key];
  if (!answer) throw new NotRecorded(key);
  return answer;
}

/** Fulfils a route with a recorded (or patched) answer. */
export function fulfil(route: Route, answer: RecordedAnswer): Promise<void> {
  return answer.body === null
    ? route.fulfill({ status: answer.status })
    : route.fulfill({
        status: answer.status,
        contentType: answer.status >= 400 ? 'application/problem+json' : 'application/json',
        body: JSON.stringify(answer.body),
      });
}

/**
 * Answers every API request of `page` from the recording. Requests without an answer get a 501
 * and are listed in `unanswered`, which the `page` fixture asserts is empty after the test.
 */
export async function installMockApi(page: Page, unanswered: string[]): Promise<void> {
  await page.route('**/api/**', async (route) => {
    try {
      await fulfil(route, await recordedAnswer(route));
    } catch (error) {
      // While recording, a test may end with a request still on its way to the API.
      if (RECORDING && !(error instanceof NotRecorded)) return;
      if (!(error instanceof NotRecorded)) throw error;
      unanswered.push(error.key);
      await route.fulfill({ status: 501, json: { title: error.message, code: 'not_recorded' } });
    }
  });
}

/** The method and URL of a request, for messages. */
export function describe(request: Request): string {
  return keyOf(request.method(), request.url());
}

/** Writes what this worker recorded; `mergeRecordings` combines the workers' shards. */
export function saveShard(workerIndex: number): void {
  if (!RECORDING || Object.keys(fresh).length === 0) return;
  mkdirSync(shardsDir, { recursive: true });
  writeFileSync(
    join(shardsDir, `worker-${workerIndex}-${process.pid}.json`),
    JSON.stringify(fresh),
  );
}

/**
 * Adds what the run recorded to the recording, sorted by key so diffs stay readable. A run of a
 * few specs refreshes their answers only; delete `responses.json` first for a fresh recording.
 */
export function mergeRecordings(): void {
  if (!existsSync(shardsDir)) return;
  const all: Record<string, RecordedAnswer> = { ...answers() };
  for (const file of readdirSync(shardsDir)) {
    Object.assign(all, JSON.parse(readFileSync(join(shardsDir, file), 'utf8')));
  }
  const sorted = Object.fromEntries(
    Object.keys(all)
      .sort()
      .map((key) => [key, all[key]]),
  );
  writeFileSync(responsesFile, `${JSON.stringify(sorted, null, 2)}\n`);
  rmSync(shardsDir, { recursive: true, force: true });
}
