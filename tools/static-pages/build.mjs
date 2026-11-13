// Builds the static copies of the server error, maintenance and not-found pages (L2-115 AC3,
// L2-117 AC1, ADR 0056; L2-243, ADR 0071) from their mocks, into frontend/projects/jubilee/public/static/. The app's host
// (eng/azure/server.js) serves them for a page load the app cannot answer. Each copy is the mock's
// <main>, the design-system tokens and the component rules it uses inlined, no script, and
// Archivo from /static/Archivo.woff2 (copied there by the app's build). The host writes the
// reference and the back-by time between the comment markers this script leaves in the copy.
// Run: node tools/static-pages/build.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'frontend/projects/jubilee/public/static');
const tokens = readFileSync(join(root, 'docs/design-system/tokens/tokens.css'), 'utf8').replace(
  /url\("\.\.\/assets\/fonts\/Archivo\.woff2"\)/,
  'url("/static/Archivo.woff2")',
);
const components = readFileSync(join(root, 'docs/design-system/assets/components.css'), 'utf8');

// Splits CSS into its top-level blocks: [prelude, body] pairs, comments dropped.
function blocks(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const found = [];
  let depth = 0;
  let start = 0;
  let open = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        found.push([text.slice(start, open).trim(), text.slice(open + 1, i)]);
        start = i + 1;
      }
    }
  }
  return found;
}

// Keeps the rules whose selectors name only classes the page uses, and the at-rules that hold them.
function prune(css, used) {
  const kept = [];
  for (const [prelude, body] of blocks(css)) {
    if (/^@(media|supports|layer|container)/.test(prelude)) {
      const inner = prune(body, used);
      if (inner) kept.push(`${prelude}{${inner}}`);
    } else if (prelude.startsWith('@')) {
      kept.push(`${prelude}{${body}}`);
    } else {
      const selectors = prelude.split(',').filter((selector) => {
        const classes = [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
        return classes.every((name) => used.has(name));
      });
      if (selectors.length > 0) kept.push(`${selectors.join(',')}{${body.trim()}}`);
    }
  }
  return kept.join('\n');
}

const pages = [
  {
    mock: 'docs/mocks/pages/server-error/default.html',
    file: 'server-error.html',
    title: 'Something went wrong · Jubilee',
    edit: (main) =>
      main
        .replace(/href="[^"]*browse\/default\.html"/, 'href=""')
        .replace(/href="[^"]*help\/default\.html"/, 'href="/help"')
        .replace(/<code>JB-500-[A-Z0-9]+<\/code>/, '<code><!--reference-->JB-500-0000<!--/reference--></code>'),
  },
  {
    mock: 'docs/mocks/pages/maintenance/default.html',
    file: 'maintenance.html',
    title: 'Being updated · Jubilee',
    edit: (main) =>
      main
        .replace(/href="[^"]*browse\/default\.html"/, 'href=""')
        .replace(
          /We’re back by .+? Eastern on [^.]+\./,
          '<!--back-by-->We’ll be back shortly.<!--/back-by-->',
        ),
  },
  {
    // Served at a listing's address that leads nowhere (L2-243 AC4 and AC6, ADR 0071). The host points its
    // links, its icon and its font at the app's origin: an address serves no file of its own.
    mock: 'docs/mocks/pages/not-found/default.html',
    file: 'not-found.html',
    title: 'Page not found · Jubilee',
    edit: (main) =>
      main
        .replace(/href="[^"]*browse\/default\.html"/, 'href="/"')
        .replace(/href="[^"]*search\/empty\.html"/, 'href="/search"'),
  },
];

mkdirSync(out, { recursive: true });
for (const page of pages) {
  const mock = readFileSync(join(root, page.mock), 'utf8');
  const main = page
    .edit(/<main[\s\S]*?<\/main>/.exec(mock)[0])
    .replace(/href="[^"]*welcome\/default\.html"/, 'href="/"')
    .replace(/ >/g, '>');
  if (/\.\.\//.test(main)) throw new Error(`${page.file} still links to a mock.`);
  const used = new Set(
    [...`${main} skip-link`.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).concat('skip-link'),
  );
  const html = `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${page.title}</title>
<link rel="icon" href="/jubilee-icon.svg" type="image/svg+xml">
<!-- Built by tools/static-pages/build.mjs from ${page.mock}; change the mock or the script, not this file. -->
<style>
${tokens.trim()}
${prune(components, used)}
</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${main}
</body>
</html>
`;
  writeFileSync(join(out, page.file), html);
}
console.log(`${pages.length} static pages written to ${out}`);
