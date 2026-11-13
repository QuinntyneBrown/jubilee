/*
 * Jubilee's service worker (ADR 0068). It is the Angular service worker, which keeps the app shell
 * so Jubilee opens with no connection, with one rule before it: a request to /api is never answered
 * by the worker. It goes to the network as if there were no worker, so no answer of the API is kept
 * in a cache, and what a member saw stays in IndexedDB, where signing out clears it (ADR 0032).
 */
self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).pathname.startsWith('/api/')) event.stopImmediatePropagation();
});

importScripts('./ngsw-worker.js');
