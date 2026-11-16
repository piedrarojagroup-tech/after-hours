'use strict';

const scope = new URL('./', self.registration.scope);
const cachePrefix = `after-hours-demo:${scope.pathname}:`;
const cacheName = cachePrefix + 'nova-3';
const shell = new Set([
  '', 'index.html', 'episode.css', 'episode-engine.js',
  'episode-ui.js', 'manifest.webmanifest', 'assets/nova-rehearsal-v8.png',
  'assets/nova-studio-v7.png', 'assets/nova-editorial.png',
].map(file => new URL(file, scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...shell])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
    (key.startsWith(cachePrefix) && key !== cacheName) ||
    (scope.pathname === '/' && /^after-hours-windows-v\d+$/.test(key))
  ).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !shell.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(request);
      if (response.ok) return response;
      return (await cache.match(url.pathname)) || response;
    } catch {
      return (await cache.match(url.pathname)) || Response.error();
    }
  })());
});
