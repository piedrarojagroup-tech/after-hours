'use strict';

const ROOT = new URL('./', self.registration.scope).pathname;
const CACHE_PREFIX = `after-hours-demo:${ROOT}:`;
const CACHE = CACHE_PREFIX + '3';
const SHELL = new Set([
  '', 'index.html', 'episode.css', 'event-sim.js', 'episode-engine.js',
  'episode-ui.js', 'manifest.webmanifest', 'assets/nova-rehearsal-v8.png',
  'assets/nova-studio-v7.png', 'assets/nova-editorial.png',
].map(file => new URL(file, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...SHELL])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !SHELL.has(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    try {
      const response = await fetch(request);
      if (response.ok) return response;
      return await cache.match(url.pathname) || response;
    } catch {
      return await cache.match(url.pathname) || Response.error();
    }
  }));
});
