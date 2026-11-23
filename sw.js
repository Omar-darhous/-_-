const cachePrefix = 'sadaqah-shell-' + self.registration.scope + '-';
const shell = cachePrefix + 'development-10';
const assets = ['./', 'index.html', 'app.js', 'data.js', 'prayer.js', 'extra-azkar.js',
  'style.css', 'install.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(shell).then(cache => cache.addAll(assets.map(url => new Request(url, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const legacy = keys.some(key => key.startsWith(cachePrefix) && /^\d+$/.test(key.slice(cachePrefix.length)));
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== shell).map(key => caches.delete(key)));
    await self.clients.claim();
    if (legacy) {
      const windows = await self.clients.matchAll({type: 'window'});
      await Promise.allSettled(windows.map(client => client.navigate(client.url)));
    }
  })());
});
const known = new Set(assets.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || !known.has(event.request.url)) return;
  event.respondWith(caches.open(shell).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
});
