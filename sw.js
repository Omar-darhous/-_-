const cachePrefix = 'sadaqah-shell-' + self.registration.scope + '-';
const shell = cachePrefix + '2';
const assets = ['./', 'index.html', 'app.js', 'data.js', 'prayer.js', 'extra-azkar.js',
  'style.css', 'install.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(shell).then(cache => cache.addAll(assets.map(url => new Request(url, {cache:'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== shell).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
const known = new Set(assets.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || !known.has(event.request.url)) return;
  event.respondWith(caches.open(shell).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
