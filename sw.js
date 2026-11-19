const CACHE = 'nzp-mobile-shell-v7';
const SHELL = ['./', './index.html', './mobile.css', './mobile.js', './manifest.webmanifest', './mobile-build.html', './mobile-build.css?v=run-dpad-right-layout-20261119', './mobile-build.js?v=run-dpad-right-layout-20261119'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nzp-mobile-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Never cache game binaries or upstream content.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
