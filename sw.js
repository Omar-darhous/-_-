const scope = self.registration.scope;
const shellPrefix = 'sadaqah-shell-' + scope + '-';
const shell = shellPrefix + 'development-11';
const mediaPrefix = 'sadaqah-media-' + scope + '-';
const mediaCacheName = mediaPrefix + 'v1';

const assets = [
  './',
  'index.html',
  'app.js',
  'data.js',
  'prayer.js',
  'extra-azkar.js',
  'offline-media.js',
  'style.css',
  'install.js',
  'manifest.webmanifest',
  'icon.svg',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
];

const mediaTypes = {
  'grandfather-ramadan.mp4': 'video/mp4',
  'grandfather-waqiah.m4a': 'audio/mp4',
  'grandfather-saffat.m4a': 'audio/mp4',
  'grandfather-recitation.mp3': 'audio/mpeg',
  'grandfather-dua.mp3': 'audio/mpeg',
  'grandfather-naml.mp3': 'audio/mpeg'
};

const knownShell = new Set(assets.map(path => new URL(path, scope).href));
const knownMedia = new Map(
  Object.entries(mediaTypes).map(([file, type]) => [new URL(file, scope).href, type])
);
const indexUrl = new URL('./', scope).href;

function parseByteRange(rangeHeader, totalSize) {
  if (typeof rangeHeader !== 'string' || !Number.isInteger(totalSize) || totalSize <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return null;
  let start;
  let end;
  if (!startStr) {
    const suffix = Number(endStr);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else {
    start = Number(startStr);
    end = endStr ? Math.min(Number(endStr), totalSize - 1) : totalSize - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= totalSize || end < start) {
    return null;
  }
  return { start, end };
}

async function serveCachedMedia(request, canonicalUrl, fallbackType) {
  let cached = null;
  try {
    const cache = await caches.open(mediaCacheName);
    cached = await cache.match(canonicalUrl, { ignoreVary: true });
  } catch {
    cached = null;
  }

  if (cached && cached.status === 200) {
    const contentType = cached.headers.get('Content-Type') || fallbackType || 'application/octet-stream';
    const blob = await cached.blob();
    const totalSize = blob.size;
    const isHead = request.method === 'HEAD';
    const rangeHeader = request.headers.get('Range');

    if (rangeHeader) {
      const range = parseByteRange(rangeHeader, totalSize);
      if (!range) {
        return new Response(null, {
          status: 416,
          statusText: 'Range Not Satisfiable',
          headers: {
            'Content-Range': `bytes */${totalSize}`,
            'Accept-Ranges': 'bytes'
          }
        });
      }
      const { start, end } = range;
      const chunkLength = end - start + 1;
      const body = isHead ? null : blob.slice(start, end + 1, contentType);
      return new Response(body, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': String(chunkLength),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        }
      });
    }

    return new Response(isHead ? null : blob, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      }
    });
  }

  try {
    return await fetch(request);
  } catch {
    return new Response('Offline media not downloaded', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(shell)
      .then(cache => cache.addAll(assets.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const legacy = keys.some(key => key.startsWith(shellPrefix) && /^\d+$/.test(key.slice(shellPrefix.length)));
    await Promise.all(
      keys
        .filter(key =>
          (key.startsWith(shellPrefix) && key !== shell) ||
          (key.startsWith(mediaPrefix) && key !== mediaCacheName)
        )
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
    if (legacy) {
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.allSettled(windows.map(client => client.navigate(client.url)));
    }
  })());
});

self.addEventListener('fetch', event => {
  const method = event.request.method;
  if (method !== 'GET' && method !== 'HEAD') return;

  const url = new URL(event.request.url);
  const canonicalUrl = url.origin + url.pathname;

  if (knownMedia.has(canonicalUrl)) {
    event.respondWith(serveCachedMedia(event.request, canonicalUrl, knownMedia.get(canonicalUrl)));
    return;
  }

  if (method !== 'GET') return;

  if (knownShell.has(canonicalUrl)) {
    event.respondWith(
      caches.open(shell).then(async cache => (await cache.match(canonicalUrl)) || (await cache.match(event.request)) || fetch(event.request))
    );
    return;
  }

  if (event.request.mode === 'navigate' && url.origin === new URL(scope).origin) {
    event.respondWith(
      caches.open(shell).then(async cache => (await cache.match(indexUrl)) || fetch(event.request))
    );
  }
});
