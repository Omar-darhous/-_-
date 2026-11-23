import test from 'node:test';
import assert from 'node:assert/strict';
import {stat, readFile} from 'node:fs/promises';
import {normalize,validateQuran,names,azkar} from './data.js';
import {OFFLINE_MEDIA, TOTAL_MEDIA_BYTES, OFFLINE_LABELS, parseByteRange, formatBytesAr} from './offline-media.js';
import {createAppServer} from './server.mjs';

test('Arabic search ignores diacritics and alif variations',()=>assert.equal(normalize('ٱلْفَاتِحَة'),normalize('الفاتحة')));
test('incomplete or malformed Quran data must be rejected',()=>{for(const data of [null,{},[],[{number:1,ayahs:[]}],Array.from({length:114},(_,i)=>({number:i+1,ayahs:[]}))])assert.equal(validateQuran(data),false);});
test('all five dedication names are retained',()=>assert.deepEqual(names,['خالد شحاتة ابراهيم','حسن الشافعي','شحاتة ابراهيم','زينات عطية','نجية محمد']));
test('after prayer and bedtime counts are distinct',()=>{assert.equal(azkar['بعد الصلاة'][4].target,33);assert.equal(azkar['قبل النوم'][3].target,34);});

test('all offline media files exist with exact expected byte sizes and are registered in build, server, and sw', async () => {
  assert.equal(OFFLINE_MEDIA.length, 6);
  const [buildSrc, serverSrc, swSrc] = await Promise.all([
    readFile('build.mjs', 'utf8'),
    readFile('server.mjs', 'utf8'),
    readFile('sw.js', 'utf8')
  ]);
  let sum = 0;
  for (const item of OFFLINE_MEDIA) {
    const info = await stat(item.file);
    assert.equal(info.size, item.bytes, `${item.file} byte size mismatch`);
    assert.ok(buildSrc.includes(item.file), `${item.file} missing in build.mjs`);
    assert.ok(serverSrc.includes(item.file), `${item.file} missing in server.mjs`);
    assert.ok(swSrc.includes(item.file), `${item.file} missing in sw.js`);
    sum += info.size;
  }
  assert.equal(sum, TOTAL_MEDIA_BYTES);
  assert.ok(buildSrc.includes('offline-media.js'));
  assert.ok(serverSrc.includes('offline-media.js'));
  assert.ok(swSrc.includes('offline-media.js'));
});

test('parseByteRange handles open, closed, clamped, suffix, and invalid ranges', () => {
  assert.deepEqual(parseByteRange('bytes=0-', 1000), { start: 0, end: 999 });
  assert.deepEqual(parseByteRange('bytes=0-1', 1000), { start: 0, end: 1 });
  assert.deepEqual(parseByteRange('bytes=250-500', 1000), { start: 250, end: 500 });
  assert.deepEqual(parseByteRange('bytes=900-5000', 1000), { start: 900, end: 999 });
  assert.deepEqual(parseByteRange('bytes=-100', 1000), { start: 900, end: 999 });
  assert.equal(parseByteRange('bytes=1000-', 1000), null);
  assert.equal(parseByteRange('bytes=500-400', 1000), null);
  assert.equal(parseByteRange('bytes=-0', 1000), null);
  assert.equal(parseByteRange('bytes=-', 1000), null);
  assert.equal(parseByteRange('items=0-10', 1000), null);
});

test('Arabic offline status labels and size formatting are valid', () => {
  assert.equal(OFFLINE_LABELS.ready, 'متاح بدون إنترنت');
  assert.equal(OFFLINE_LABELS.needsDownload, 'يحتاج إلى تحميل');
  assert.equal(OFFLINE_LABELS.downloading, 'جاري التحميل...');
  assert.equal(OFFLINE_LABELS.error, 'تعذر إكمال التحميل');
  assert.equal(OFFLINE_LABELS.success, 'تم تحميل التلاوات والابتهالات بنجاح، ويمكنك الآن الاستماع إليها بدون إنترنت.');
  assert.ok(formatBytesAr(34751302).includes('ميجابايت'));
  assert.ok(formatBytesAr(623122).includes('كيلوبايت'));
});

test('HTTP server serves 200, 206 Partial Content, and 416 Range Not Satisfiable for media', async () => {
  const server = createAppServer(process.cwd());
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const head = await fetch(`${base}/grandfather-ramadan.mp4`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('accept-ranges'), 'bytes');
    assert.equal(head.headers.get('content-type'), 'video/mp4');
    assert.equal(Number(head.headers.get('content-length')), 34751302);

    const partial = await fetch(`${base}/grandfather-ramadan.mp4`, { headers: { Range: 'bytes=0-1023' } });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 0-1023/34751302');
    assert.equal(Number(partial.headers.get('content-length')), 1024);
    const bytes = new Uint8Array(await partial.arrayBuffer());
    assert.equal(bytes.byteLength, 1024);

    const invalid = await fetch(`${base}/grandfather-ramadan.mp4`, { headers: { Range: 'bytes=999999999-' } });
    assert.equal(invalid.status, 416);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
