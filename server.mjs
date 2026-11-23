import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {parseByteRange} from './offline-media.js';

const root = process.env.SERVE_DIR ? path.resolve(process.cwd(), process.env.SERVE_DIR) : process.cwd();
const allowed = new Set([
  'grandfather-waqiah.m4a',
  'grandfather-saffat.m4a',
  'grandfather-ramadan.mp4',
  'grandfather-recitation.mp3',
  'grandfather-dua.mp3',
  'grandfather-naml.mp3',
  'index.html',
  'style.css',
  'app.js',
  'data.js',
  'icon.svg',
  'prayer.js',
  'extra-azkar.js',
  'offline-media.js',
  'install.js',
  'sw.js',
  'manifest.webmanifest',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png'
]);
const types = {
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

export function createAppServer(baseDir = root) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        return res.end('Method not allowed');
      }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(baseDir, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(baseDir + path.sep) || !allowed.has(path.relative(baseDir, file))) {
        res.writeHead(404);
        return res.end('Not found');
      }
      const info = await stat(file);
      const contentType = types[path.extname(file)] || 'application/octet-stream';
      const rangeHeader = req.headers.range;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', contentType);
      if (path.basename(file) === 'sw.js') {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }

      if (rangeHeader) {
        const range = parseByteRange(rangeHeader, info.size);
        if (!range) {
          res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
          return res.end();
        }
        const { start, end } = range;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Content-Length': String(end - start + 1)
        });
        if (req.method === 'HEAD') return res.end();
        return createReadStream(file, { start, end }).pipe(res);
      }

      res.writeHead(200, { 'Content-Length': String(info.size) });
      if (req.method === 'HEAD') return res.end();
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

if (import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  const port = Number(process.env.PORT || 5173);
  createAppServer().listen(port, '127.0.0.1', () => console.log('Sadaqah Jariyah: http://localhost:' + port));
}
