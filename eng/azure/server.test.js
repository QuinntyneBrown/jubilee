// Acceptance tests of server.js, the host of the three sites (eng/azure/README.md). Run with
// `node --test eng/azure/server.test.js`. Each test starts server.js as App Service does, with its settings in
// the environment, against a stand-in for the Jubilee API. Nothing but Node's standard library.
//
// Traces to: L2-218 (AC8, AC9), L2-216 (AC6, AC10), L2-217 (AC6), L2-186, L2-038 (AC4), L2-113 (AC1 to AC3),
// L2-114 (AC1), L2-115 (AC3), L2-117 (AC1); ADR 0040, ADR 0044, ADR 0047, ADR 0055, ADR 0056.
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const serverFile = path.join(__dirname, 'server.js');
const NOTIFICATIONS = '/api/launch/notifications';
const BUSINESSES = '/api/launch/businesses';
const SIGN_UP = JSON.stringify({ email: 'joanna.adeyemi@example.com', firstName: 'Joanna', consent: true });
const cleanups = [];

after(async () => {
  for (const cleanup of cleanups.reverse()) {
    await cleanup();
  }
});

function folder() {
  const made = fs.mkdtempSync(path.join(os.tmpdir(), 'jubilee-server-'));
  cleanups.push(() => fs.rmSync(made, { recursive: true, force: true }));
  return made;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/**
 * A stand-in for the Jubilee API. `answer` decides each answer and may be replaced while it runs.
 * On 127.0.0.2 it is "another host" to server.js; on 127.0.0.1 it is the API beside it.
 */
async function standIn(host, answer) {
  const api = { requests: [], answer };
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const seen = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') };
      api.requests.push(seen);
      const { status = 202, headers = {}, body = '', afterMs = 0 } = api.answer(seen) || {};
      setTimeout(() => {
        res.writeHead(status, headers);
        res.end(body);
      }, afterMs);
    });
  });
  await new Promise((resolve) => server.listen(0, host, resolve));
  api.origin = `http://${host}:${server.address().port}`;
  api.host = `${host}:${server.address().port}`;
  api.to = (path_) => api.requests.filter((request) => request.url === path_);
  cleanups.push(() => {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
  });
  return api;
}

/**
 * Starts server.js with these settings and waits until it serves. The port is free when it is
 * chosen, but another socket of the machine can take it before server.js listens; then it starts
 * again on another port.
 */
async function host(settings) {
  const root = folder();
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><title>Jubilee</title>');
  for (let attempt = 1; ; attempt++) {
    try {
      return await start(root, settings);
    } catch (error) {
      if (attempt === 5 || !/EADDRINUSE/.test(error.message)) throw error;
    }
  }
}

async function start(root, settings) {
  const port = await freePort();
  const child = spawn(process.execPath, [serverFile], {
    env: { PATH: process.env.PATH, PORT: String(port), STATIC_ROOT: root, ...settings },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const site = { port, root, log: '' };
  cleanups.push(() => child.kill());
  await new Promise((resolve, reject) => {
    child.on('exit', (code) => reject(new Error(`server.js stopped with ${code}: ${site.log}`)));
    const read = (chunk) => {
      site.log += chunk;
      if (site.log.includes('Serving ')) resolve();
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
  });
  site.stop = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      child.kill();
    });
  return site;
}

function call(site, { method = 'GET', path: path_ = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port: site.port, method, path: path_, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject);
    request.end(body);
  });
}

function post(site, path_, body = SIGN_UP, headers = {}) {
  return call(site, {
    method: 'POST',
    path: path_,
    body,
    headers: { 'Content-Type': 'application/json', Host: 'www.jubilee.test', 'X-Forwarded-For': '198.51.100.7, 203.0.113.5:51234', ...headers },
  });
}

async function until(check, what) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`Timed out waiting until ${what}.`);
}

const kept = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith('.json')) : []);

/** The marketing host as the deployment sets it, with short waits so the tests are quick. */
function marketingHost(api, more = {}) {
  const dir = path.join(folder(), 'launch-kept');
  return host({
    API_ORIGIN: api.origin,
    API_PATHS: '/api/launch',
    PROXY_KEY: 'the-proxy-key',
    KEEP_DIR: dir,
    KEEP_AFTER_MS: '400',
    REPLAY_EVERY_MS: '150',
    ...more,
  }).then((site) => Object.assign(site, { dir }));
}

// ---- The link preview of a shared listing (L2-038 AC4, ADR 0055) ----

const PREVIEW = '<!doctype html><title>Legacy Financial · Jubilee</title><meta property="og:image" content="https://app.jubilee.test/og-image.png">';
const FETCHERS = {
  Facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  X: 'Twitterbot/1.0',
  LinkedIn: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  WhatsApp: 'WhatsApp/2.23.20.0',
  Slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  Discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  Telegram: 'TelegramBot (like TwitterBot)',
  iMessage: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
};

function previewApi() {
  return standIn('127.0.0.1', (seen) =>
    seen.url.endsWith('/social-preview') ? { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: PREVIEW } : { status: 404 },
  );
}

for (const [app, agent] of Object.entries(FETCHERS)) {
  test(`Given the app's host, when ${app}'s link-preview fetcher asks for /b/{slug}, then it gets the social preview of the API`, async () => {
    const api = await previewApi();
    const site = await host({ API_ORIGIN: api.origin });

    const answer = await call(site, { path: '/b/legacy-financial', headers: { 'User-Agent': agent, Host: 'app.jubilee.test' } });

    assert.equal(answer.status, 200);
    assert.equal(answer.body, PREVIEW);
    assert.match(answer.headers['content-type'], /^text\/html/);
    assert.deepEqual(api.requests.map((r) => r.url), ['/api/listings/legacy-financial/social-preview']);
    assert.equal(api.requests[0].headers.host, 'app.jubilee.test');
  });
}

test('Given the app\'s host, when a browser asks for /b/{slug}, then it gets the app and the API is not called', async () => {
  const api = await previewApi();
  const site = await host({ API_ORIGIN: api.origin });

  const answer = await call(site, {
    path: '/b/legacy-financial',
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
  });

  assert.equal(answer.status, 200);
  assert.equal(answer.body, '<!doctype html><title>Jubilee</title>');
  assert.equal(api.requests.length, 0);
});

test('Given the app\'s host, when a search engine asks for /b/{slug}, then it gets the app, as a browser does', async () => {
  const api = await previewApi();
  const site = await host({ API_ORIGIN: api.origin });

  const answer = await call(site, {
    path: '/b/legacy-financial',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  });

  assert.equal(answer.body, '<!doctype html><title>Jubilee</title>');
  assert.equal(api.requests.length, 0);
});

test('Given a link-preview fetcher, when it asks for a listing that is not public, then the API\'s 404 is relayed with no listing tags', async () => {
  const api = await standIn('127.0.0.1', () => ({ status: 404, headers: { 'Content-Type': 'application/problem+json' }, body: '{"status":404}' }));
  const site = await host({ API_ORIGIN: api.origin });

  const answer = await call(site, { path: '/b/paused-one', headers: { 'User-Agent': FETCHERS.Slack } });

  assert.equal(answer.status, 404);
  assert.doesNotMatch(answer.body, /og:/);
});

test('Given a link-preview fetcher, when it asks for a page under a listing or another page, then it gets the app', async () => {
  const api = await previewApi();
  const site = await host({ API_ORIGIN: api.origin });

  for (const path_ of ['/b/legacy-financial/p/a-product', '/b/', '/c/financial-insurance', '/b/legacy-financial/share']) {
    const answer = await call(site, { path: path_, headers: { 'User-Agent': FETCHERS.Facebook } });
    assert.equal(answer.body, '<!doctype html><title>Jubilee</title>', path_);
  }
  assert.equal(api.requests.length, 0);
});

test('Given a link-preview fetcher and a query string, when it asks for /b/{slug}, then the preview is of the slug alone', async () => {
  const api = await previewApi();
  const site = await host({ API_ORIGIN: api.origin });

  await call(site, { path: '/b/legacy-financial?utm_source=whatsapp', headers: { 'User-Agent': FETCHERS.WhatsApp } });

  assert.deepEqual(api.requests.map((r) => r.url), ['/api/listings/legacy-financial/social-preview']);
});

test('Given the marketing host, which forwards only /api/launch, when a link-preview fetcher asks for /b/{slug}, then it gets the page and the API is not called', async () => {
  const api = await previewApi();
  const site = await host({ API_ORIGIN: api.origin, API_PATHS: '/api/launch' });

  const answer = await call(site, { path: '/b/legacy-financial', headers: { 'User-Agent': FETCHERS.Facebook } });

  assert.equal(answer.body, '<!doctype html><title>Jubilee</title>');
  assert.equal(api.requests.length, 0);
});

test('Given the app\'s public folder, when og-image.png is asked for, then it is served as a PNG', async () => {
  const site = await host({});
  fs.copyFileSync(path.join(__dirname, '..', '..', 'frontend', 'projects', 'jubilee', 'public', 'og-image.png'), path.join(site.root, 'og-image.png'));

  const answer = await call(site, { path: '/og-image.png', headers: { 'User-Agent': FETCHERS.Facebook } });

  assert.equal(answer.status, 200);
  assert.equal(answer.headers['content-type'], 'image/png');
});

// ---- The status of a page load (L2-113, L2-114 AC1, L2-115 AC3, L2-117 AC1, ADR 0056) ----

const APP = '<!doctype html><title>Jubilee</title>';
const PUBLIC = path.join(__dirname, '..', '..', 'frontend', 'projects', 'jubilee', 'public');
const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** The app's host: the API beside it, and the app's routes.json and static pages in its folder. */
async function appHost(answer, settings = {}) {
  const api = await standIn('127.0.0.1', (seen) =>
    seen.url.startsWith('/api/documents/status') ? answer(seen) : { status: 200, headers: { 'Content-Type': 'text/html' }, body: PREVIEW },
  );
  const site = await host({ API_ORIGIN: api.origin, ...settings });
  fs.copyFileSync(path.join(PUBLIC, 'routes.json'), path.join(site.root, 'routes.json'));
  fs.mkdirSync(path.join(site.root, 'static'));
  for (const name of ['server-error.html', 'maintenance.html']) {
    fs.copyFileSync(path.join(PUBLIC, 'static', name), path.join(site.root, 'static', name));
  }
  return { api, site, asked: () => api.requests.filter((r) => r.url.startsWith('/api/documents/status')).map((r) => r.url) };
}

const status = (value, more = {}) => () => ({
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: value, ...more }),
});
const maintenance = (backBy) => () => ({
  status: 503,
  headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '7200' },
  body: JSON.stringify({ status: 503, code: 'MAINTENANCE', ...(backBy ? { backBy } : {}) }),
});
const page = (site, path_, headers = {}) => call(site, { path: path_, headers: { 'User-Agent': BROWSER, ...headers } });

test('Given an address of the app whose records exist, when it is loaded, then the API is asked with the cookie and the app answers 200', async () => {
  const { site, api, asked } = await appHost(status(200));

  const answer = await page(site, '/search?q=tees', { Cookie: '__Host-jubilee.session=abc' });

  assert.equal(answer.status, 200);
  assert.equal(answer.body, APP);
  assert.deepEqual(asked(), ['/api/documents/status?path=%2Fsearch']);
  assert.equal(api.requests[0].headers.cookie, '__Host-jubilee.session=abc');
});

test('Given an address that is no page of the app, when it is loaded, then it answers 404 with the app', async () => {
  const { site } = await appHost(status(200));

  for (const path_ of ['/no-such-page', '/b/luzandre/p', '/my-business/elsewhere', '/search/more']) {
    const answer = await page(site, path_);
    assert.equal(answer.status, 404, path_);
    assert.equal(answer.body, APP, path_);
    assert.equal(answer.headers['cache-control'], 'no-store', path_);
  }
});

test('Given a listing that is missing or not public, when its page is loaded, then the API\'s 404 is the page load\'s', async () => {
  const { site } = await appHost(status(404));

  const answer = await page(site, '/b/gone-co');

  assert.equal(answer.status, 404);
  assert.equal(answer.body, APP);
});

test('Given an old slug of a renamed listing, when its page is loaded, then it answers 301 to the current address with the query kept', async () => {
  const { site } = await appHost(status(301, { location: '/b/luzandre/p/faith-tee' }));

  const answer = await page(site, '/b/luzandre-print-co/p/faith-tee?utm_source=whatsapp');

  assert.equal(answer.status, 301);
  assert.equal(answer.headers.location, '/b/luzandre/p/faith-tee?utm_source=whatsapp');
});

test('Given a link-preview fetcher and an old slug, when it asks for /b/{slug}, then it is redirected before any preview', async () => {
  const { site, api } = await appHost(status(301, { location: '/b/luzandre' }));

  const answer = await call(site, { path: '/b/luzandre-print-co', headers: { 'User-Agent': FETCHERS.WhatsApp } });

  assert.equal(answer.status, 301);
  assert.equal(answer.headers.location, '/b/luzandre');
  assert.equal(api.requests.filter((r) => r.url.endsWith('/social-preview')).length, 0);
});

test('Given a link-preview fetcher and a public listing, when it asks for /b/{slug}, then it still gets the social preview', async () => {
  const { site } = await appHost(status(200));

  const answer = await call(site, { path: '/b/legacy-financial', headers: { 'User-Agent': FETCHERS.Facebook } });

  assert.equal(answer.body, PREVIEW);
});

test('Given the owner\'s workspace, when a member who owns no listing loads it, then the API is asked as an owner page and it answers 403 with the app', async () => {
  const { site, asked } = await appHost(status(403));

  const answer = await page(site, '/my-business/requests');

  assert.equal(answer.status, 403);
  assert.equal(answer.body, APP);
  assert.deepEqual(asked(), ['/api/documents/status?path=%2Fmy-business%2Frequests&owner=true']);
});

test('Given maintenance, when any page is loaded, then it answers 503 with Retry-After and the static page with the back-by time', async () => {
  const { site } = await appHost(maintenance('2026-11-11T11:00:00+00:00'));

  for (const path_ of ['/', '/b/luzandre', '/no-such-page']) {
    const answer = await page(site, path_);
    assert.equal(answer.status, 503, path_);
    assert.equal(answer.headers['retry-after'], '7200');
    assert.equal(answer.headers['cache-control'], 'no-store');
    assert.match(answer.headers['content-type'], /^text\/html/);
    assert.match(answer.body, /<h1 class="empty__title">Jubilee is being updated<\/h1>/);
    assert.match(answer.body, /We’re back by 6:00 a\.m\. Eastern on Wednesday 11 November\. Nothing you’ve sent is lost\./);
    assert.match(answer.body, /href="">.*Check again<\/a>/s);
    assert.doesNotMatch(answer.body, /<script/i);
    assert.match(answer.body, /url\("\/static\/Archivo\.woff2"\)/);
  }
});

test('Given maintenance without a back-by time, when a page is loaded, then the static page says it will be back shortly', async () => {
  const { site } = await appHost(maintenance(null));

  const answer = await page(site, '/');

  assert.equal(answer.status, 503);
  assert.match(answer.body, /We’ll be back shortly\. Nothing you’ve sent is lost\./);
});

test('Given the API fails with an unhandled error, when a page is loaded, then it answers 500 with the static error page and the API\'s reference', async () => {
  const { site } = await appHost(() => ({
    status: 500,
    headers: { 'Content-Type': 'application/problem+json' },
    body: JSON.stringify({ status: 500, code: 'unexpected_error', reference: 'JB-500-7F3K', detail: 'at Jubilee.Api.Something in C:\\src\\x.cs' }),
  }));

  const answer = await page(site, '/b/luzandre');

  assert.equal(answer.status, 500);
  assert.match(answer.body, /Something went wrong on our side/);
  assert.match(answer.body, /Reference <code>JB-500-7F3K<\/code>/);
  assert.match(answer.body, /href="\/help"/);
  assert.doesNotMatch(answer.body, /<script|Jubilee\.Api|x\.cs/i);
});

test('Given the API does not answer in time or cannot be reached, when a page is loaded, then the app is served with 200', async () => {
  const slow = await appHost(() => ({ ...status(200)(), afterMs: 1500 }), { DOCUMENT_STATUS_TIMEOUT_MS: '200' });
  assert.equal((await page(slow.site, '/b/luzandre')).status, 200);

  const site = await host({ API_ORIGIN: `http://127.0.0.1:${await freePort()}` });
  fs.copyFileSync(path.join(PUBLIC, 'routes.json'), path.join(site.root, 'routes.json'));
  const answer = await page(site, '/search');
  assert.equal(answer.status, 200);
  assert.equal(answer.body, APP);
});

test('Given the app\'s files cannot be read, when a page is loaded, then it answers 500 with the static error page and a reference in the log', async () => {
  const { site } = await appHost(status(200));
  fs.rmSync(path.join(site.root, 'index.html'));

  const answer = await page(site, '/search');

  assert.equal(answer.status, 500);
  const reference = /Reference <code>(JB-500-[A-Z2-9]{4})<\/code>/.exec(answer.body);
  assert.ok(reference, 'the page shows a reference');
  await until(() => site.log.includes(reference[1]), 'the log names the reference');
  assert.match(site.log, new RegExp(`${reference[1]}.*correlation [0-9a-f-]{36}`));
});

test('Given a file, a HEAD of a page and a request that is not a page load, then the API is asked only for page loads', async () => {
  const { site, asked } = await appHost(status(404));
  fs.writeFileSync(path.join(site.root, 'main-ABCDEFGH.js'), 'console.log(1)');

  assert.equal((await page(site, '/main-ABCDEFGH.js')).status, 200);
  assert.equal((await call(site, { method: 'HEAD', path: '/b/gone-co' })).status, 404);
  assert.deepEqual(asked(), ['/api/documents/status?path=%2Fb%2Fgone-co']);
});

test('Given a folder without routes.json (the marketing and admin sites), when a page is loaded, then nothing is asked and the page answers 200', async () => {
  const api = await standIn('127.0.0.1', status(404));
  const site = await host({ API_ORIGIN: api.origin });

  const answer = await page(site, '/no-such-page');

  assert.equal(answer.status, 200);
  assert.equal(api.requests.length, 0);
});

// ---- The Host of a forwarded request (ADR 0047) ----

test('Given an API on another host and no proxy key, when /api is forwarded, then Host names the API, not the public host', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 200, headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  const site = await host({ API_ORIGIN: api.origin, API_PATHS: '/api/launch' });

  const answer = await call(site, { path: '/api/launch', headers: { Host: 'www.jubilee.test' } });

  assert.equal(answer.status, 200);
  assert.equal(answer.body, '{}');
  assert.equal(api.requests[0].headers.host, api.host);
  assert.equal(api.requests[0].headers['x-jubilee-proxy-key'], undefined);
});

test('Given an API on another host and a proxy key, when /api is forwarded, then Host names the API and the proxy states the caller', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 200, body: '{}' }));
  const site = await host({ API_ORIGIN: api.origin, PROXY_KEY: 'the-proxy-key' });

  await call(site, { path: '/api/launch', headers: { Host: 'www.jubilee.test', 'X-Forwarded-For': '198.51.100.7, 203.0.113.5:51234' } });

  assert.equal(api.requests[0].headers.host, api.host);
  assert.equal(api.requests[0].headers['x-jubilee-proxy-key'], 'the-proxy-key');
  assert.equal(api.requests[0].headers['x-jubilee-client-address'], '203.0.113.5');
});

test('Given the API beside it on loopback, when /api is forwarded, then Host stays the public host', async () => {
  const api = await standIn('127.0.0.1', () => ({ status: 200, body: '{}' }));
  const site = await host({ API_ORIGIN: api.origin });

  await call(site, { path: '/api/session', headers: { Host: 'app.jubilee.test' } });

  assert.equal(api.requests[0].headers.host, 'app.jubilee.test');
});

// The app's host runs this server in front of the API on loopback, without a key of its own. What
// the marketing host's proxy states of a launch submission reaches the API through it (L2-218 AC9).
test('Given the API beside it on loopback and no key, when a kept launch submission is forwarded, then what the marketing host stated passes unchanged', async () => {
  const api = await standIn('127.0.0.1', () => ({ status: 202 }));
  const site = await host({ API_ORIGIN: api.origin });

  await post(site, '/api/launch/notifications', SIGN_UP, {
    'X-Jubilee-Proxy-Key': 'the-proxy-key',
    'X-Jubilee-Client-Address': '203.0.113.5',
    'X-Jubilee-Received-At': '2026-11-12T16:01:10.000Z',
    'X-Jubilee-Kept': 'true',
  });

  assert.equal(api.requests[0].headers['x-jubilee-proxy-key'], 'the-proxy-key');
  assert.equal(api.requests[0].headers['x-jubilee-received-at'], '2026-11-12T16:01:10.000Z');
  assert.equal(api.requests[0].headers['x-jubilee-kept'], 'true');
});

test('Given an API on another host, when a caller states a received time and a kept mark itself, then neither reaches the API', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 200, body: '{}' }));
  const site = await host({ API_ORIGIN: api.origin, PROXY_KEY: 'the-proxy-key' });

  await call(site, { path: '/api/launch', headers: { 'X-Jubilee-Received-At': '2020-01-01T00:00:00.000Z', 'X-Jubilee-Kept': 'true' } });

  assert.equal(api.requests[0].headers['x-jubilee-received-at'], undefined);
  assert.equal(api.requests[0].headers['x-jubilee-kept'], undefined);
});

test('Given API_PATHS names /api/launch, when another /api path is asked for, then it answers 404 and the API is not called', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 200, body: '{}' }));
  const site = await host({ API_ORIGIN: api.origin, API_PATHS: '/api/launch' });

  const answer = await call(site, { path: '/api/session' });

  assert.equal(answer.status, 404);
  assert.equal(api.requests.length, 0);
});

test('Given no API_ORIGIN, when /api/launch is asked for, then it answers 404, never the page', async () => {
  const site = await host({});

  assert.equal((await call(site, { path: '/api/launch' })).status, 404);
  assert.equal((await call(site, { path: '/' })).status, 200);
});

// ---- Submissions the API takes or refuses pass through (L2-218 AC8) ----

test('Given the API accepts a sign-up, when it is sent, then 202 is relayed, nothing is kept and the API is told when it was received', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 202 }));
  const site = await marketingHost(api);
  const before = Date.now();

  const answer = await post(site, NOTIFICATIONS, SIGN_UP, { 'X-Jubilee-Received-At': '2001-01-01T00:00:00.000Z', 'X-Jubilee-Kept': 'true' });

  assert.equal(answer.status, 202);
  assert.equal(answer.body, '');
  const [seen] = api.to(NOTIFICATIONS);
  assert.equal(seen.body, SIGN_UP);
  assert.equal(seen.headers.host, api.host);
  assert.equal(seen.headers['x-jubilee-proxy-key'], 'the-proxy-key');
  assert.equal(seen.headers['x-jubilee-client-address'], '203.0.113.5');
  // The time is the proxy's own, whatever the caller claimed, and a first attempt is not marked as kept.
  const received = Date.parse(seen.headers['x-jubilee-received-at']);
  assert.ok(received >= before && received <= Date.now(), seen.headers['x-jubilee-received-at']);
  assert.equal(seen.headers['x-jubilee-kept'], undefined);
  assert.deepEqual(kept(site.dir), []);
});

for (const refusal of [
  { status: 422, headers: { 'Content-Type': 'application/problem+json' }, body: '{"code":"validation_failed","errors":{"email":"EMAIL_INVALID"}}' },
  { status: 429, headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '2520' }, body: '{"code":"rate_limited"}' },
  { status: 400, headers: { 'Content-Type': 'application/problem+json' }, body: '{"status":400}' },
]) {
  test(`Given the API answers ${refusal.status}, when a submission is sent, then the answer is relayed unchanged and nothing is kept`, async () => {
    const api = await standIn('127.0.0.2', () => refusal);
    const site = await marketingHost(api);

    const answer = await post(site, BUSINESSES);

    assert.equal(answer.status, refusal.status);
    assert.equal(answer.body, refusal.body);
    assert.equal(answer.headers['content-type'], refusal.headers['Content-Type']);
    assert.equal(answer.headers['retry-after'], refusal.headers['Retry-After']);
    assert.deepEqual(kept(site.dir), []);
  });
}

// ---- Submissions the API cannot take are kept and confirmed (L2-218 AC8) ----

for (const fault of [500, 503, 404, 403, 401, 408]) {
  test(`Given the API answers ${fault}, when a sign-up with consent is sent, then it is kept and the caller is answered 202 with no body`, async () => {
    const api = await standIn('127.0.0.2', () => ({ status: fault, body: 'Not found.' }));
    const site = await marketingHost(api);

    const answer = await post(site, NOTIFICATIONS);

    assert.equal(answer.status, 202);
    assert.equal(answer.body, '');
    const [file] = kept(site.dir);
    const entry = JSON.parse(fs.readFileSync(path.join(site.dir, file), 'utf8'));
    assert.equal(entry.path, NOTIFICATIONS);
    assert.equal(entry.body, SIGN_UP);
    assert.equal(entry.address, '203.0.113.5');
    assert.ok(Math.abs(Date.parse(entry.receivedAt) - Date.now()) < 5000);
    // No log line holds any part of the submission.
    assert.doesNotMatch(site.log, /joanna|Joanna|203\.0\.113/);
    assert.match(site.log, /Kept a launch submission \(1 waiting\)\./);
  });
}

test('Given the API cannot be reached, when a pre-registration is sent, then it is kept and answered 202', async () => {
  const closed = await freePort();
  const site = await marketingHost({ origin: `http://127.0.0.2:${closed}` });

  const answer = await post(site, BUSINESSES, JSON.stringify({ businessName: 'Luzandre.com', email: 'naomi@luzandre.com', consent: true }));

  assert.equal(answer.status, 202);
  assert.equal(kept(site.dir).length, 1);
});

test('Given the API does not answer in time, when a sign-up is sent, then it is kept and answered 202 before the page gives up', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 202, afterMs: 3000 }));
  const site = await marketingHost(api);
  const started = Date.now();

  const answer = await post(site, NOTIFICATIONS);

  assert.equal(answer.status, 202);
  assert.ok(Date.now() - started < 2500, 'answered when the wait ran out, not when the API did');
  assert.equal(kept(site.dir).length, 1);
});

for (const [what, body] of [
  ['consent', JSON.stringify({ email: 'joanna@example.com', consent: false })],
  ['an e-mail address', JSON.stringify({ firstName: 'Joanna', consent: true })],
  ['a JSON object', 'email=joanna@example.com&consent=true'],
]) {
  test(`Given the API is failing, when a submission without ${what} is sent, then nothing is kept and the failure is relayed`, async () => {
    const api = await standIn('127.0.0.2', () => ({ status: 500, body: 'failed' }));
    const site = await marketingHost(api);

    const answer = await post(site, NOTIFICATIONS, body);

    assert.equal(answer.status, 500);
    assert.deepEqual(kept(site.dir), []);
  });
}

test('Given a body over 16 KB, when it is sent, then it answers 413 and neither forwards nor keeps it', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 500 }));
  const site = await marketingHost(api);

  const answer = await post(site, NOTIFICATIONS, JSON.stringify({ email: 'joanna@example.com', consent: true, firstName: 'J'.repeat(17000) }));

  assert.equal(answer.status, 413);
  assert.equal(api.requests.length, 0);
  assert.deepEqual(kept(site.dir), []);
});

test('Given no KEEP_DIR, when the API is failing, then the failure is relayed as before', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 500, body: 'failed' }));
  const site = await host({ API_ORIGIN: api.origin, API_PATHS: '/api/launch' });

  const answer = await post(site, NOTIFICATIONS);

  assert.equal(answer.status, 500);
});

test('Given the API is failing, when the form settings are asked for, then that failure is relayed: only the two submissions are kept', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 500, body: 'failed' }));
  const site = await marketingHost(api);

  assert.equal((await call(site, { path: '/api/launch' })).status, 500);
  assert.deepEqual(kept(site.dir), []);
});

// ---- Kept submissions are sent again until the API accepts them (L2-218 AC8, AC9) ----

test('Given a kept sign-up, when the API is back, then it is sent again as kept with its received time and caller, and removed', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 503 }));
  const site = await marketingHost(api);
  await post(site, NOTIFICATIONS);
  const [file] = kept(site.dir);
  const entry = JSON.parse(fs.readFileSync(path.join(site.dir, file), 'utf8'));
  // The API fails a few more rounds, and the submission stays.
  await until(() => api.requests.length >= 3, 'the kept sign-up was tried again');
  assert.equal(kept(site.dir).length, 1);

  api.requests.length = 0;
  api.answer = () => ({ status: 202 });

  await until(() => kept(site.dir).length === 0, 'the kept sign-up was accepted and removed');
  const [again] = api.requests;
  assert.equal(again.method, 'POST');
  assert.equal(again.url, NOTIFICATIONS);
  assert.equal(again.body, SIGN_UP);
  assert.equal(again.headers['content-type'], 'application/json');
  assert.equal(again.headers.host, api.host);
  assert.equal(again.headers['x-jubilee-kept'], 'true');
  assert.equal(again.headers['x-jubilee-received-at'], entry.receivedAt);
  assert.equal(again.headers['x-jubilee-client-address'], '203.0.113.5');
  assert.equal(again.headers['x-jubilee-proxy-key'], 'the-proxy-key');
  await until(() => /Sent 1 kept launch submission \(0 waiting\)\./.test(site.log), 'the log says one was sent');
  // Once accepted it is not sent again.
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(api.requests.length, 1);
});

test('Given submissions kept before a restart, when the host starts again, then they are sent, oldest first', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 503 }));
  const site = await marketingHost(api);
  await post(site, NOTIFICATIONS, JSON.stringify({ email: 'first@example.com', consent: true }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  await post(site, BUSINESSES, JSON.stringify({ businessName: 'Second', email: 'second@example.com', consent: true }));
  assert.equal(kept(site.dir).length, 2);
  await site.stop();

  api.requests.length = 0;
  api.answer = () => ({ status: 202 });
  await host({ API_ORIGIN: api.origin, API_PATHS: '/api/launch', PROXY_KEY: 'the-proxy-key', KEEP_DIR: site.dir, REPLAY_EVERY_MS: '150' });

  await until(() => kept(site.dir).length === 0, 'both were accepted');
  assert.deepEqual(api.requests.map((request) => request.url), [NOTIFICATIONS, BUSINESSES]);
});

test('Given a kept submission the API refuses as invalid, when it is sent again, then it is removed and only the count is logged', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 503 }));
  const site = await marketingHost(api);
  await post(site, NOTIFICATIONS, JSON.stringify({ email: 'not-an-address@', consent: true }));
  assert.equal(kept(site.dir).length, 1);

  api.answer = () => ({ status: 422, body: '{"code":"validation_failed"}' });

  await until(() => kept(site.dir).length === 0, 'the refused submission was removed');
  await until(() => /Removed 1 kept launch submission the API refused as invalid\./.test(site.log), 'the log says one was refused');
  assert.doesNotMatch(site.log, /not-an-address/);
});

test('Given a kept submission and the limit of its address, when the API answers 429, then it stays for a later round', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 503 }));
  const site = await marketingHost(api);
  await post(site, NOTIFICATIONS);

  api.requests.length = 0;
  api.answer = () => ({ status: 429, headers: { 'Retry-After': '60' } });

  await until(() => api.requests.length >= 2, 'it was tried again more than once');
  assert.equal(kept(site.dir).length, 1);
});

test('Given a kept submission 12 months old, when the round runs, then it is deleted unsent', async () => {
  const api = await standIn('127.0.0.2', () => ({ status: 202 }));
  const dir = path.join(folder(), 'launch-kept');
  fs.mkdirSync(dir, { recursive: true });
  const old = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);
  fs.writeFileSync(
    path.join(dir, `${old.getTime()}-old.json`),
    JSON.stringify({ path: NOTIFICATIONS, body: SIGN_UP, receivedAt: old.toISOString(), address: '203.0.113.5' }),
  );

  const site = await host({ API_ORIGIN: api.origin, API_PATHS: '/api/launch', PROXY_KEY: 'the-proxy-key', KEEP_DIR: dir, REPLAY_EVERY_MS: '150' });

  await until(() => kept(dir).length === 0, 'the old submission was deleted');
  await until(() => /Deleted 1 kept launch submission 12 months old\./.test(site.log), 'the log says one was deleted');
  assert.equal(api.requests.length, 0);
});
