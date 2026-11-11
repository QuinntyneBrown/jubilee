// Serves a built Angular application on Azure App Service (Linux) with nothing but Node's
// standard library. Used by eng/azure/deploy.sh for both sites:
//   - the marketing site: static files only;
//   - the app: static files, and /api sent to the Jubilee API running beside it (API_ORIGIN).
// Unknown paths without a file extension answer index.html so the app's router can take them.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.resolve(process.env.STATIC_ROOT || path.join(__dirname, 'public'));
const port = Number(process.env.PORT || 8080);
const api = process.env.API_ORIGIN ? new URL(process.env.API_ORIGIN) : null;

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

function proxy(req, res) {
  const upstream = http.request(
    {
      hostname: api.hostname,
      port: api.port || 80,
      method: req.method,
      path: req.url,
      // The headers pass unchanged: Host stays the public host, and X-Forwarded-For / -Proto are
      // the ones App Service wrote, so the API sees the caller's address and HTTPS.
      headers: req.headers,
    },
    (answer) => {
      res.writeHead(answer.statusCode || 502, answer.headers);
      answer.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(503, { 'Content-Type': 'application/problem+json', 'Retry-After': '5', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ status: 503, title: 'Jubilee is starting.', code: 'UNAVAILABLE' }));
  });
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
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
  res.setHeader(
    'Cache-Control',
    ext === '.html' ? 'no-cache' : hashed.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
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
  const urlPath = (req.url || '/').split('?')[0];
  if (api && (urlPath === '/api' || urlPath.startsWith('/api/'))) {
    return proxy(req, res);
  }
  return serve(req, res);
});
// /api/events is a long-lived stream; never cut a request short.
server.requestTimeout = 0;
server.timeout = 0;
server.listen(port, () => console.log(`Serving ${root} on ${port}${api ? `, /api -> ${api.origin}` : ''}`));
