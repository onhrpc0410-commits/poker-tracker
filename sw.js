var CACHE = 'poker-tracker-v1';
var ASSETS = ['./', 'index.html', 'style.css', 'manifest.json', 'js/store.js', 'js/engine.js', 'js/ui-players.js',
  'js/ui-setup.js', 'js/ui-game.js', 'js/ui-summary.js', 'js/app.js', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
});
self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request); }));
});
