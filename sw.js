const CACHE = 'nzp-mobile-shell-v1';
const SHELL = ['./', './index.html', './mobile.css', './mobile.js', './manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nzp-mobile-shell-') && key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Never cache game binaries or upstream content.
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
