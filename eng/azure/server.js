// Serves a built Angular application on Azure App Service (Linux) with nothing but Node's
// standard library. Used by eng/azure/deploy.sh for the three sites:
//   - the marketing site: static files, and only /api/launch (API_PATHS) sent to https://app.jubilee.to
//     (API_ORIGIN) with the caller's address, proved by PROXY_KEY, as for the admin host. ADR 0044.
//     A launch submission the API cannot take is kept in KEEP_DIR, answered 202 and sent again
//     until the API accepts it. ADR 0047;
//   - the app: static files, and /api sent to the Jubilee API running beside it (API_ORIGIN);
//   - the admin application: static files, and /api sent to https://app.jubilee.to (API_ORIGIN) with
//     the caller's address in X-Jubilee-Client-Address, proved by X-Jubilee-Proxy-Key (PROXY_KEY).
//     See ADR 0040.
// Unknown paths without a file extension answer index.html so the app's router can take them, except
// that a link-preview fetcher's /b/{slug} is answered with the API's social preview (ADR 0055).
// Where the folder holds routes.json (the app's host), a page load gets its status first: the address
// is matched against routes.json and the API is asked (GET /api/documents/status) for a 404, 403 or
// 301; maintenance answers 503 and an unhandled failure 500 with static pages (ADR 0056).
// With ADDRESS_DOMAIN and APP_ORIGIN set (the app's host), a request whose Host is one label under that domain is a
// listing's own address, https://{slug}.jubilee.to: it is answered 301 to the listing's page on APP_ORIGIN, which
// the API decides (GET /api/addresses/{label}), or with the static not-found page; never with a file, the API or a
// cookie. A Host that is neither one of OWN_HOSTS nor under the domain is refused with 400 (ADR 0067).
// server.test.js beside this file holds its tests: `node --test eng/azure/server.test.js`.
'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(process.env.STATIC_ROOT || path.join(__dirname, 'public'));
const port = Number(process.env.PORT || 8080);
const api = process.env.API_ORIGIN ? new URL(process.env.API_ORIGIN) : null;
const proxyKey = process.env.PROXY_KEY || '';
// The paths this host sends to the API: all of /api unless API_PATHS names fewer (ADR 0044). Any
// other /api path answers 404 here, so a public host never forwards a staff path.
const apiPaths = (process.env.API_PATHS || '/api')
  .split(',')
  .map((entry) => entry.trim().replace(/\/+$/, ''))
  .filter(Boolean);
// The API is on another host unless it runs beside this server, as on the app's host. A request
// sent to another host always names that host: App Service's front end routes by it (ADR 0047).
const remote = api !== null && !['127.0.0.1', 'localhost', '[::1]'].includes(api.hostname);

// Kept submissions (L2-218 AC8 and AC9, ADR 0047): the folder, how long the API has to answer
// before a submission is kept (inside the page's 10 seconds), and how often the kept ones are sent
// again.
const keepDir = process.env.KEEP_DIR ? path.resolve(process.env.KEEP_DIR) : null;
const keepAfterMs = Number(process.env.KEEP_AFTER_MS || 8000);
const replayEveryMs = Number(process.env.REPLAY_EVERY_MS || 60_000);
const keptPaths = ['/api/launch/notifications', '/api/launch/businesses'];
const maxBody = 16 * 1024;
const maxKept = 1000;
const retentionMs = 365 * 24 * 60 * 60 * 1000;

// Link-preview fetchers of chat and social apps (L2-038 AC4, ADR 0055). They run no script, so a
// shared /b/{slug} is answered with the API's social preview, which carries the Open Graph tags.
// iMessage names itself facebookexternalhit and Twitterbot. A search engine is not listed: it runs
// the app, and is given what a browser is given.
const previewAgents =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|Slackbot|Discordbot|TelegramBot|Pinterest|redditbot|SkypeUriPreview|Applebot|Bluesky|Cardyb|Mastodon|Embedly|Iframely/i;

// The API path of the social preview, when this request is a link-preview fetcher's /b/{slug} on a
// host that forwards that path to the API (the app's host); otherwise null.
function previewPath(req) {
  if (!api || (req.method !== 'GET' && req.method !== 'HEAD')) {
    return null;
  }
  const listing = /^\/b\/([^/.?]{1,200})\/?$/.exec((req.url || '/').split('?')[0]);
  if (!listing || !previewAgents.test(String(req.headers['user-agent'] || ''))) {
    return null;
  }
  const target = `/api/listings/${listing[1]}/social-preview`;
  return forwarded(target) ? target : null;
}

function forwarded(urlPath) {
  return apiPaths.some((prefix) => urlPath === prefix || urlPath.startsWith(prefix + '/'));
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.vtt': 'text/vtt; charset=utf-8',
};
const compressible = /^(text\/|application\/(json|manifest\+json|xml)|image\/svg\+xml)/;
// Angular names built files `name-HASH.ext`; those never change, so a browser may keep them.
const hashed = /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;
// The service worker's script and manifest are asked for again each time, so a deploy is seen at once (ADR 0068).
const worker = /[\\/](jubilee-sw\.js|ngsw-worker\.js|safety-worker\.js|ngsw\.json)$/;
const gzipped = new Map();

function secure(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

function plain(req, res, status, text) {
  secure(req, res);
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(req.method === 'HEAD' ? undefined : text);
}

// The caller's address as App Service's front end wrote it: the last X-Forwarded-For entry, without
// its port ("203.0.113.5:51234", "[2001:db8::1]:51234"). Earlier entries came from the caller.
function callerAddress(req) {
  const entries = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const last = entries[entries.length - 1] || req.socket.remoteAddress || '';
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(last);
  if (bracketed) {
    return bracketed[1];
  }
  return /^[\d.]+:\d+$/.test(last) ? last.slice(0, last.lastIndexOf(':')) : last;
}

// What the API is told of a forwarded request. On another host, Host names the API. With the proxy
// key the API is told who the caller is and that this proxy says so, in place of anything the
// caller sent (ADR 0040). The two headers of a launch submission are this proxy's to state, never
// the caller's (ADR 0047). Beside the API without a key (the app's host) nothing is stated and
// nothing is removed: what the marketing host's proxy stated passes, and the API believes it only
// with the key.
function stamp(headers, address) {
  if (remote || proxyKey) {
    delete headers['x-jubilee-received-at'];
    delete headers['x-jubilee-kept'];
  }
  if (remote) {
    headers.host = api.host;
  }
  if (proxyKey) {
    headers['x-jubilee-client-address'] = address;
    headers['x-jubilee-proxy-key'] = proxyKey;
  }
  return headers;
}

function upstreamOptions(method, urlPath, headers) {
  return {
    hostname: api.hostname,
    port: api.port || (api.protocol === 'https:' ? 443 : 80),
    method,
    path: urlPath,
    headers,
  };
}

function unavailable(res) {
  res.writeHead(503, { 'Content-Type': 'application/problem+json', 'Retry-After': '5', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ status: 503, title: 'Jubilee is starting.', code: 'UNAVAILABLE' }));
}

function proxy(req, res, upstreamPath = req.url) {
  // Beside the API (the app's host) the headers pass unchanged: Host stays the public host, and
  // X-Forwarded-For / -Proto are the ones App Service wrote, so the API sees the caller and HTTPS.
  // A caller's own X-Jubilee-Proxy-Key and X-Jubilee-Client-Address pass too: the API believes
  // the address only with the right key, compared in fixed time, and removes both either way.
  const headers = stamp({ ...req.headers }, callerAddress(req));
  const client = api.protocol === 'https:' ? https : http;
  const upstream = client.request(upstreamOptions(req.method, upstreamPath, headers), (answer) => {
    res.writeHead(answer.statusCode || 502, answer.headers);
    answer.pipe(res);
  });
  upstream.on('error', () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    unavailable(res);
  });
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
}

// ---- Launch submissions: kept when the API cannot take them (ADR 0047) ----

// Sends one submission to the API and resolves with its whole answer. Rejects when the API cannot
// be reached or takes longer than keepAfterMs.
function send(entry, kept, contentType) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(entry.body, 'utf8');
    const headers = stamp(
      { host: entry.host || api.host, 'content-type': contentType || 'application/json', 'content-length': body.length },
      entry.address,
    );
    headers['x-jubilee-received-at'] = entry.receivedAt;
    if (kept) {
      headers['x-jubilee-kept'] = 'true';
    }
    const client = api.protocol === 'https:' ? https : http;
    const upstream = client.request(upstreamOptions('POST', entry.path, headers), (answer) => {
      const chunks = [];
      answer.on('data', (chunk) => chunks.push(chunk));
      answer.on('end', () => {
        clearTimeout(timer);
        resolve({ status: answer.statusCode || 502, headers: answer.headers, body: Buffer.concat(chunks) });
      });
      answer.on('error', reject);
    });
    const timer = setTimeout(() => upstream.destroy(new Error('The API did not answer in time.')), keepAfterMs);
    upstream.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    upstream.end(body);
  });
}

// An answer that says the API could not take the submission, as opposed to one the visitor can act
// on (400, 422, 429): a fault of the API, of the route to it, or of a setting.
function faulty(status) {
  return status >= 500 || (status >= 300 && status < 400) || [401, 403, 404, 408].includes(status);
}

// Only a submission that carries consent and an e-mail address is kept: without them nothing valid
// could be stored, and nothing is kept that a person did not agree to.
function keepable(entry) {
  try {
    const sent = JSON.parse(entry.body);
    return (
      sent !== null &&
      typeof sent === 'object' &&
      sent.consent === true &&
      typeof sent.email === 'string' &&
      sent.email.includes('@')
    );
  } catch {
    return false;
  }
}

function keptFiles() {
  try {
    return fs
      .readdirSync(keepDir)
      .filter((name) => name.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
}

// Writes the submission to a file of its own and flushes it before the caller is told it is safe.
// The log says how many wait, and nothing of what they hold.
function keep(entry) {
  try {
    fs.mkdirSync(keepDir, { recursive: true, mode: 0o700 });
    const waiting = keptFiles().length;
    if (waiting >= maxKept) {
      console.error(`A launch submission was not kept: ${waiting} wait already.`);
      return false;
    }
    const file = path.join(keepDir, `${Date.now()}-${crypto.randomUUID()}.json`);
    const descriptor = fs.openSync(`${file}.part`, 'wx', 0o600);
    try {
      fs.writeSync(
        descriptor,
        JSON.stringify({ path: entry.path, body: entry.body, receivedAt: entry.receivedAt, address: entry.address }),
      );
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(`${file}.part`, file);
    console.log(`Kept a launch submission (${waiting + 1} waiting).`);
    return true;
  } catch (error) {
    console.error(`A launch submission could not be kept (${error.code || 'error'}).`);
    return false;
  }
}

function relay(res, answer) {
  const headers = { ...answer.headers };
  delete headers['transfer-encoding'];
  delete headers.connection;
  headers['content-length'] = answer.body.length;
  res.writeHead(answer.status, headers);
  res.end(answer.body);
}

// POST /api/launch/notifications and /api/launch/businesses. The API's answer is relayed when it
// took the submission or refused it. When it could not take it, the submission is kept and the
// caller is answered as the API would have answered: 202 with no body.
function submit(req, res, urlPath) {
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size <= maxBody) {
      chunks.push(chunk);
    }
  });
  req.on('error', () => res.destroy());
  req.on('end', async () => {
    if (size > maxBody) {
      res.writeHead(413, { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ status: 413, title: 'That is too much to send.' }));
    }
    const entry = {
      path: urlPath,
      body: Buffer.concat(chunks).toString('utf8'),
      receivedAt: new Date().toISOString(),
      address: callerAddress(req),
      host: req.headers.host,
    };
    let answer = null;
    try {
      answer = await send(entry, false, req.headers['content-type']);
    } catch {
      // Not reached, or not in time: the same as a fault.
    }
    if (answer && !faulty(answer.status)) {
      return relay(res, answer);
    }
    if (keepable(entry) && keep(entry)) {
      res.writeHead(202, { 'Cache-Control': 'no-store' });
      return res.end();
    }
    return answer ? relay(res, answer) : unavailable(res);
  });
}

const counted = (n) => `${n} kept launch submission${n === 1 ? '' : 's'}`;

// One round: the kept submissions go to the API again, oldest first. Accepted, or refused as
// invalid, a submission leaves. Anything else ends the round until the next one. A submission 12
// months old is deleted unsent (L2-218 AC6, AC9).
let replaying = false;
async function replay() {
  if (replaying) {
    return;
  }
  replaying = true;
  let sent = 0;
  let refused = 0;
  let expired = 0;
  try {
    for (const name of keptFiles()) {
      const file = path.join(keepDir, name);
      let entry;
      try {
        entry = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        continue;
      }
      if (Date.now() - Date.parse(entry.receivedAt) > retentionMs) {
        fs.rmSync(file, { force: true });
        expired++;
        continue;
      }
      let status;
      try {
        status = (await send(entry, true)).status;
      } catch {
        break;
      }
      if (status >= 200 && status < 300) {
        fs.rmSync(file, { force: true });
        sent++;
      } else if (faulty(status) || status === 429) {
        break;
      } else {
        fs.rmSync(file, { force: true });
        refused++;
      }
    }
  } catch (error) {
    console.error(`The kept launch submissions could not be sent (${error.code || 'error'}).`);
  } finally {
    replaying = false;
  }
  if (sent > 0) {
    console.log(`Sent ${counted(sent)} (${keptFiles().length} waiting).`);
  }
  if (refused > 0) {
    console.log(`Removed ${counted(refused)} the API refused as invalid.`);
  }
  if (expired > 0) {
    console.log(`Deleted ${counted(expired)} 12 months old.`);
  }
}

// ---- Page loads: the status of the app's document (L2-113, L2-114 AC1, L2-115 AC3, L2-117 AC1, ADR 0056) ----

const statusTimeoutMs = Number(process.env.DOCUMENT_STATUS_TIMEOUT_MS || 3000);
const STATUS_PATH = '/api/documents/status';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TORONTO = 'America/Toronto';
let routes = { mtimeMs: -1, value: null };

// routes.json of the app, read again when it changes; null where there is none (the marketing and admin sites).
function appRoutes() {
  const file = path.join(root, 'routes.json');
  const found = stat(file);
  if (!found) {
    return null;
  }
  if (found.mtimeMs !== routes.mtimeMs) {
    try {
      const read = JSON.parse(fs.readFileSync(file, 'utf8'));
      const compile = (list) => (Array.isArray(list) ? list.map((pattern) => pattern.split('/').filter(Boolean)) : []);
      routes = { mtimeMs: found.mtimeMs, value: { pages: compile(read.pages), owner: compile(read.owner) } };
    } catch {
      console.error('routes.json could not be read.');
      routes = { mtimeMs: found.mtimeMs, value: null };
    }
  }
  return routes.value;
}

function matches(segments, pattern) {
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '**') {
      return true;
    }
    if (i >= segments.length || (pattern[i].startsWith(':') ? segments[i] === '' : segments[i] !== pattern[i])) {
      return false;
    }
  }
  return segments.length === pattern.length;
}

// 'page', 'owner' (the owner's workspace) or null when the app has no such page.
function pageKind(known, urlPath) {
  const segments = urlPath.split('/').filter(Boolean);
  if (known.owner.some((pattern) => matches(segments, pattern))) {
    return 'owner';
  }
  return known.pages.some((pattern) => matches(segments, pattern)) ? 'page' : null;
}

// Asks the API what this page load answers. Resolves with its answer, or null when it did not answer in time.
function askStatus(req, urlPath, owner) {
  return new Promise((resolve) => {
    const headers = stamp({ host: req.headers.host || api.host, accept: 'application/json' }, callerAddress(req));
    for (const name of ['cookie', 'x-forwarded-for', 'x-forwarded-proto', 'x-correlation-id']) {
      if (req.headers[name]) {
        headers[name] = req.headers[name];
      }
    }
    const target = `${STATUS_PATH}?path=${encodeURIComponent(urlPath)}${owner ? '&owner=true' : ''}`;
    const client = api.protocol === 'https:' ? https : http;
    const upstream = client.request(upstreamOptions('GET', target, headers), (answer) => {
      const chunks = [];
      answer.on('data', (chunk) => chunks.push(chunk));
      answer.on('end', () => {
        clearTimeout(timer);
        let body = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          // Not JSON: only the status is read.
        }
        resolve({ status: answer.statusCode || 502, headers: answer.headers, body });
      });
      answer.on('error', () => resolve(null));
    });
    const timer = setTimeout(() => upstream.destroy(new Error('The API did not answer in time.')), statusTimeoutMs);
    upstream.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    upstream.end();
  });
}

// "6:00 a.m. Eastern on Wednesday 11 November", as the app's maintenance page says it.
function backByText(value) {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) {
    return null;
  }
  const time = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: TORONTO }).format(at);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TORONTO })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${time.replace(/\s/g, ' ')} Eastern on ${parts.weekday} ${parts.day} ${parts.month}`;
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// One of the static pages of public/static/ (no script), with what sits between its markers replaced.
function staticPage(req, res, status, name, fills, headers = {}) {
  let html;
  try {
    html = fs.readFileSync(path.join(root, 'static', name), 'utf8');
  } catch {
    return plain(req, res, status, status === 503 ? 'Jubilee is being updated.' : 'Something went wrong on our side.');
  }
  for (const [marker, text] of Object.entries(fills)) {
    html = html.replace(new RegExp(`<!--${marker}-->[\\s\\S]*?<!--/${marker}-->`), escapeHtml(text));
  }
  secure(req, res);
  res.writeHead(status, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store', ...headers });
  res.end(req.method === 'HEAD' ? undefined : html);
}

// The static server error page with a reference this host logs with its own correlation ID.
function hostFailure(req, res, what) {
  const correlation = crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(correlation, 'utf8').digest();
  const reference = `JB-500-${[0, 1, 2, 3].map((i) => ALPHABET[hash[i] % ALPHABET.length]).join('')}`;
  console.error(`${reference}: ${what} (correlation ${correlation}).`);
  return staticPage(req, res, 500, 'server-error.html', { reference });
}

// The app's index.html with the status of the page load; never cached, as its status may change.
function serveApp(req, res, status) {
  let html;
  try {
    html = fs.readFileSync(path.join(root, 'index.html'));
  } catch {
    return hostFailure(req, res, 'the app could not be read');
  }
  secure(req, res);
  res.writeHead(status, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store', 'Content-Length': html.length });
  return res.end(req.method === 'HEAD' ? undefined : html);
}

async function pageLoad(req, res, known, urlPath) {
  const kind = pageKind(known, urlPath);
  const answer = await askStatus(req, urlPath, kind === 'owner');
  const body = answer && answer.body && typeof answer.body === 'object' ? answer.body : {};
  if (answer && answer.status === 503 && body.code === 'MAINTENANCE') {
    const when = body.backBy ? backByText(body.backBy) : null;
    return staticPage(req, res, 503, 'maintenance.html', { 'back-by': when ? `We’re back by ${when}.` : 'We’ll be back shortly.' }, {
      'Retry-After': String(answer.headers['retry-after'] || 300),
    });
  }
  if (answer && answer.status === 500) {
    const reference = /^JB-500-[A-Z0-9]{4}$/.test(String(body.reference)) ? body.reference : null;
    return reference
      ? staticPage(req, res, 500, 'server-error.html', { reference })
      : hostFailure(req, res, 'the API failed without a reference');
  }
  const decided = answer && answer.status === 200 ? body.status : 200;
  if (decided === 301 && typeof body.location === 'string' && /^\/[^/\\]/.test(body.location)) {
    const query = (req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    secure(req, res);
    res.writeHead(301, { Location: body.location + query, 'Cache-Control': 'no-store' });
    return res.end();
  }
  if (decided === 404 || decided === 403) {
    return serveApp(req, res, decided);
  }
  if (kind === null) {
    return serveApp(req, res, 404);
  }
  if (!stat(path.join(root, 'index.html'))) {
    return hostFailure(req, res, 'the app could not be read');
  }
  const preview = previewPath(req);
  return preview ? proxy(req, res, preview) : serve(req, res);
}

// ---- A listing's own address: https://{slug}.{ADDRESS_DOMAIN} (L2-242 AC6, L2-243, L2-246, ADR 0067) ----

// Off unless both are set: the domain addresses sit under, and the origin of the app they lead to.
const addressDomain = (process.env.ADDRESS_DOMAIN || '').trim().replace(/^\.+|\.+$/g, '').toLowerCase();
const appOrigin = (process.env.APP_ORIGIN || '').trim().replace(/\/+$/, '');
const addresses = addressDomain !== '' && /^https?:\/\/[^/\s]+$/.test(appOrigin);
// The hosts Jubilee serves itself from this site: OWN_HOSTS and the name App Service gave it.
const ownHosts = new Set(
  `${process.env.OWN_HOSTS || ''},${process.env.WEBSITE_HOSTNAME || ''}`
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean),
);
// What a slug can be: 3 to 40 of a to z, 0 to 9 and single hyphens (AddressRules in the API).
const wellFormed = /^(?=.{3,40}$)[a-z0-9]+(-[a-z0-9]+)*$/;
const ADDRESS_PATH = '/api/addresses/';

// Whose request this is: { kind: 'own' }, { kind: 'address', label }, { kind: 'malformed' } (under the domain but
// not one well-formed label) or { kind: 'foreign' }. A loopback name or an IP literal is the platform's own probe.
function hostKind(req) {
  const name = String(req.headers.host || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
  if (name === '' || name === 'localhost' || ownHosts.has(name) || /^[\d.]+$/.test(name) || /^\[[0-9a-f:.]+\]$/.test(name)) {
    return { kind: 'own' };
  }
  if (!name.endsWith('.' + addressDomain)) {
    return { kind: 'foreign' };
  }
  const label = name.slice(0, -addressDomain.length - 1);
  return wellFormed.test(label) ? { kind: 'address', label } : { kind: 'malformed' };
}

// The static not-found page, its links, icon and font pointed at the app: an address serves no file of its own.
function addressNotFound(req, res) {
  let html;
  try {
    html = fs.readFileSync(path.join(root, 'static', 'not-found.html'), 'utf8');
  } catch {
    return plain(req, res, 404, 'Not found.');
  }
  html = html.replace(/(href=|url\()"\/(?!\/)/g, `$1"${appOrigin}/`);
  secure(req, res);
  res.writeHead(404, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store' });
  return res.end(req.method === 'HEAD' ? undefined : html);
}

// Asks the API where the address leads. Resolves with its answer, or null when it did not answer in time. No cookie
// is passed: an address reads none (L2-246 AC3).
function askAddress(req, label, urlPath) {
  return new Promise((resolve) => {
    const headers = stamp({ host: api.host, accept: 'application/json' }, callerAddress(req));
    for (const name of ['x-forwarded-for', 'x-forwarded-proto', 'x-correlation-id']) {
      if (req.headers[name]) {
        headers[name] = req.headers[name];
      }
    }
    const client = api.protocol === 'https:' ? https : http;
    const target = `${ADDRESS_PATH}${label}?path=${encodeURIComponent(urlPath)}`;
    const upstream = client.request(upstreamOptions('GET', target, headers), (answer) => {
      const chunks = [];
      answer.on('data', (chunk) => chunks.push(chunk));
      answer.on('end', () => {
        clearTimeout(timer);
        let body = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          // Not JSON: only the status is read.
        }
        resolve({ status: answer.statusCode || 502, headers: answer.headers, body });
      });
      answer.on('error', () => resolve(null));
    });
    const timer = setTimeout(() => upstream.destroy(new Error('The API did not answer in time.')), statusTimeoutMs);
    upstream.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    upstream.end();
  });
}

// Answers a listing's address: 301 to its page in the app, or the not-found page. The target is APP_ORIGIN, a
// setting, then a path under /b/ the API built, then the query as it came; nothing of the request can name another
// site (L2-246 AC6).
async function openAddress(req, res, label) {
  const url = req.url || '/';
  const urlPath = url.split('?')[0];
  if (!api || (req.method !== 'GET' && req.method !== 'HEAD') || urlPath === '/api' || urlPath.startsWith('/api/')) {
    return addressNotFound(req, res);
  }
  const answer = await askAddress(req, label, urlPath);
  if (!answer || answer.status >= 500) {
    secure(req, res);
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '5', 'Cache-Control': 'no-store' });
    return res.end(req.method === 'HEAD' ? undefined : 'Jubilee is starting.');
  }
  if (answer.status === 429) {
    secure(req, res);
    res.writeHead(429, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': String(answer.headers['retry-after'] || 60),
      'Cache-Control': 'no-store',
    });
    return res.end(req.method === 'HEAD' ? undefined : 'You’re doing that a lot. Try again shortly.');
  }
  const location = answer.status === 200 && answer.body && typeof answer.body.location === 'string' ? answer.body.location : '';
  if (!/^\/b\/[A-Za-z0-9%._~-]+(\/[A-Za-z0-9%._~!$&'()*+,;=:@-]+)*$/.test(location) || /(^|\/)\.\.?(\/|$)/.test(location)) {
    return addressNotFound(req, res);
  }
  secure(req, res);
  res.writeHead(301, { Location: appOrigin + location + (url.includes('?') ? url.slice(url.indexOf('?')) : ''), 'Cache-Control': 'no-store' });
  return res.end();
}

function locate(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) {
    return null;
  }
  const file = path.join(root, path.normalize('/' + decoded));
  return file === root || file.startsWith(root + path.sep) ? file : null;
}

function stat(file) {
  try {
    const found = fs.statSync(file);
    return found.isFile() ? found : null;
  } catch {
    return null;
  }
}

function serve(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return plain(req, res, 405, 'Method not allowed.');
  }

  const urlPath = (req.url || '/').split('?')[0];
  let file = locate(urlPath);
  if (!file) {
    return plain(req, res, 400, 'Bad request.');
  }
  let found = stat(file);
  if (!found) {
    if (path.extname(urlPath)) {
      return plain(req, res, 404, 'Not found.');
    }
    file = path.join(root, 'index.html');
    found = stat(file);
    if (!found) {
      return plain(req, res, 404, 'Not found.');
    }
  }

  const ext = path.extname(file).toLowerCase();
  const type = types[ext] || 'application/octet-stream';
  const etag = `"${found.size.toString(16)}-${Math.floor(found.mtimeMs).toString(16)}"`;
  secure(req, res);
  res.setHeader('Content-Type', type);
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', found.mtime.toUTCString());
  if (ext === '.woff2' || ext === '.woff') {
    // A font is fetched with CORS: the not-found page of a listing's address draws Archivo from the app (ADR 0067).
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader(
    'Cache-Control',
    ext === '.html' || worker.test(file) ? 'no-cache' : hashed.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  );
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    return res.end();
  }

  const head = req.method === 'HEAD';
  if (compressible.test(type)) {
    res.setHeader('Vary', 'Accept-Encoding');
    if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || '')) && found.size < 5_000_000) {
      let body = gzipped.get(file);
      if (!body || body.etag !== etag) {
        body = { etag, data: zlib.gzipSync(fs.readFileSync(file)) };
        gzipped.set(file, body);
      }
      res.writeHead(200, { 'Content-Encoding': 'gzip', 'Content-Length': body.data.length });
      return res.end(head ? undefined : body.data);
    }
  }

  // Byte ranges, so a browser can seek in the pitch film (Safari will not play it without them).
  res.setHeader('Accept-Ranges', 'bytes');
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : found.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : found.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, found.size - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${found.size}` });
      return res.end();
    }
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${found.size}`, 'Content-Length': end - start + 1 });
    return head ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
  }

  res.writeHead(200, { 'Content-Length': found.size });
  return head ? res.end() : fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  if (addresses) {
    const whose = hostKind(req);
    if (whose.kind === 'address') {
      return openAddress(req, res, whose.label);
    }
    if (whose.kind === 'malformed') {
      return addressNotFound(req, res);
    }
    if (whose.kind === 'foreign') {
      return plain(req, res, 400, 'Bad request.');
    }
  }
  const urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    // Without an API, or outside API_PATHS, an /api path is never answered with the page.
    if (!api || !forwarded(urlPath)) {
      return plain(req, res, 404, 'Not found.');
    }
    return keepDir && req.method === 'POST' && keptPaths.includes(urlPath) ? submit(req, res, urlPath) : proxy(req, res);
  }
  const known = api && forwarded(STATUS_PATH) && (req.method === 'GET' || req.method === 'HEAD') && !path.extname(urlPath) ? appRoutes() : null;
  if (known) {
    return pageLoad(req, res, known, urlPath);
  }
  const preview = previewPath(req);
  return preview ? proxy(req, res, preview) : serve(req, res);
});
// /api/events is a long-lived stream; never cut a request short.
server.requestTimeout = 0;
server.timeout = 0;
server.listen(port, () => {
  console.log(`Serving ${root} on ${port}${api ? `, ${apiPaths.join(', ')} -> ${api.origin}` : ''}`);
  if (api && keepDir) {
    replay();
    setInterval(replay, replayEveryMs);
  }
});
