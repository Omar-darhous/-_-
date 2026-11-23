export const OFFLINE_MEDIA_VERSION = 'v1';
export const OFFLINE_STORAGE_FLAG = 'sadaqah-offline-media-ready-v1';

export const OFFLINE_MEDIA = [
  {
    file: 'grandfather-ramadan.mp4',
    title: 'ابتهالات رمضان — الحاج حسن الشافعي',
    type: 'video/mp4',
    bytes: 34751302
  },
  {
    file: 'grandfather-recitation.mp3',
    title: 'سورة الفاتحة ثم سورة البقرة (١–٢٨)',
    type: 'audio/mpeg',
    bytes: 8531800
  },
  {
    file: 'grandfather-dua.mp3',
    title: 'دعاء بصوت جدي في الصلاة',
    type: 'audio/mpeg',
    bytes: 3613257
  },
  {
    file: 'grandfather-naml.mp3',
    title: 'سورة النمل (٦١–٦٦)',
    type: 'audio/mpeg',
    bytes: 2051761
  },
  {
    file: 'grandfather-saffat.m4a',
    title: 'سورة الصافات (٩٩–١٠٩) ثم سورة الكوثر',
    type: 'audio/mp4',
    bytes: 678201
  },
  {
    file: 'grandfather-waqiah.m4a',
    title: 'سورة الواقعة (٨٣–٩٦)',
    type: 'audio/mp4',
    bytes: 623122
  }
];

export const TOTAL_MEDIA_BYTES = OFFLINE_MEDIA.reduce((sum, item) => sum + item.bytes, 0);

export const OFFLINE_LABELS = {
  ready: 'متاح بدون إنترنت',
  needsDownload: 'يحتاج إلى تحميل',
  downloading: 'جاري التحميل...',
  error: 'تعذر إكمال التحميل',
  success: 'تم تحميل التلاوات والابتهالات بنجاح، ويمكنك الآن الاستماع إليها بدون إنترنت.'
};

export function parseByteRange(rangeHeader, totalSize) {
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

export function formatBytesAr(bytes) {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe >= 1024 * 1024) {
    return (safe / (1024 * 1024)).toLocaleString('ar-EG', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }) + ' ميجابايت';
  }
  if (safe >= 1024) {
    return Math.round(safe / 1024).toLocaleString('ar-EG') + ' كيلوبايت';
  }
  return safe.toLocaleString('ar-EG') + ' بايت';
}

export function getMediaScope() {
  if (typeof document !== 'undefined' && document.baseURI) {
    return new URL('./', document.baseURI).href;
  }
  if (typeof location !== 'undefined' && location.href) {
    return new URL('./', location.href).href;
  }
  return '/';
}

export function getMediaCacheName(scope = getMediaScope()) {
  return `sadaqah-media-${scope}-${OFFLINE_MEDIA_VERSION}`;
}

function getFileUrl(file, scope = getMediaScope()) {
  return new URL(file, scope).href;
}

function readDownloadedFlag() {
  try {
    return localStorage.getItem(OFFLINE_STORAGE_FLAG) === '1';
  } catch {
    return false;
  }
}

function writeDownloadedFlag(value) {
  try {
    if (value) localStorage.setItem(OFFLINE_STORAGE_FLAG, '1');
    else localStorage.removeItem(OFFLINE_STORAGE_FLAG);
  } catch {
    // Ignore storage flag restrictions when Cache Storage is still available.
  }
}

async function isCachedComplete(cache, item, scope) {
  const url = getFileUrl(item.file, scope);
  const response = await cache.match(url, { ignoreVary: true });
  if (!response || response.status !== 200) return { ok: false, bytes: 0 };
  const headerBytes = Number(response.headers.get('X-Offline-Bytes') || response.headers.get('Content-Length') || 0);
  if (headerBytes !== item.bytes) return { ok: false, bytes: 0 };
  try {
    const blob = await response.blob();
    if (blob.size === item.bytes) return { ok: true, bytes: blob.size };
  } catch {
    return { ok: false, bytes: 0 };
  }
  return { ok: false, bytes: 0 };
}

const listeners = new Set();

const state = {
  status: 'needsDownload', // 'needsDownload' | 'downloading' | 'ready' | 'error'
  downloadedBytes: 0,
  totalBytes: TOTAL_MEDIA_BYTES,
  completedFiles: 0,
  totalFiles: OFFLINE_MEDIA.length,
  currentFileTitle: '',
  filesStatus: Object.fromEntries(OFFLINE_MEDIA.map(item => [item.file, false])),
  message: '',
  warning: '',
  storageAvailable: true,
  initialized: false
};

let activeDownload = null;

function emit() {
  const snapshot = getOfflineMediaState();
  listeners.forEach(fn => {
    try { fn(snapshot); } catch { /* Keep remaining listeners updated. */ }
  });
}

export function getOfflineMediaState() {
  return {
    ...state,
    filesStatus: { ...state.filesStatus },
    percent: state.totalBytes > 0 ? Math.min(100, Math.round((state.downloadedBytes / state.totalBytes) * 100)) : 0
  };
}

export function subscribeOfflineMedia(fn) {
  listeners.add(fn);
  fn(getOfflineMediaState());
  return () => listeners.delete(fn);
}

async function inspectCacheState({ silent = false } = {}) {
  if (typeof window === 'undefined' || !('caches' in window)) {
    state.storageAvailable = false;
    state.status = 'error';
    state.downloadedBytes = 0;
    state.completedFiles = 0;
    state.warning = 'تنبيه: مساحة التخزين بدون إنترنت غير متاحة في هذا المتصفح أو في الوضع الحالي.';
    state.message = '';
    state.initialized = true;
    emit();
    return getOfflineMediaState();
  }

  try {
    const scope = getMediaScope();
    const cache = await caches.open(getMediaCacheName(scope));
    let savedBytes = 0;
    let savedCount = 0;
    const nextMap = {};

    for (const item of OFFLINE_MEDIA) {
      const check = await isCachedComplete(cache, item, scope);
      nextMap[item.file] = check.ok;
      if (check.ok) {
        savedBytes += check.bytes;
        savedCount++;
      }
    }

    state.storageAvailable = true;
    state.filesStatus = nextMap;
    state.downloadedBytes = savedBytes;
    state.completedFiles = savedCount;
    state.currentFileTitle = '';
    state.initialized = true;

    const previouslyDownloaded = readDownloadedFlag();

    if (savedCount === OFFLINE_MEDIA.length) {
      state.status = 'ready';
      state.warning = '';
      if (!silent || !state.message) {
        state.message = OFFLINE_LABELS.success;
      }
      writeDownloadedFlag(true);
    } else {
      state.status = 'needsDownload';
      state.message = '';
      if (previouslyDownloaded) {
        state.warning = savedCount > 0
          ? 'تنبيه: قام المتصفح بحذف بعض الملفات المحفوظة مسبقًا. اضغط على زر التحميل لاستعادة الملفات الناقصة دون إعادة تحميل الملفات المحفوظة.'
          : 'تنبيه: قام المتصفح بحذف الملفات المحفوظة سابقًا. يرجى إعادة التحميل للاستماع والمشاهدة بدون إنترنت.';
      } else {
        state.warning = '';
      }
    }
  } catch {
    state.storageAvailable = false;
    state.status = 'error';
    state.warning = 'تنبيه: تعذّر الوصول إلى مساحة التخزين المحلية على هذا الجهاز.';
    state.message = '';
    state.initialized = true;
  }

  emit();
  return getOfflineMediaState();
}

export async function refreshOfflineMediaStatus() {
  if (activeDownload) return getOfflineMediaState();
  return inspectCacheState({ silent: true });
}

async function ensureServiceWorkerReady() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('./');
    if (reg?.active) return true;
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(resolve => setTimeout(resolve, 4000))
    ]);
    const refreshed = await navigator.serviceWorker.getRegistration('./');
    return Boolean(refreshed?.active);
  } catch {
    return false;
  }
}

async function checkAvailableQuota(neededBytes) {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return { ok: true };
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (typeof quota === 'number' && typeof usage === 'number' && quota > 0) {
      const remaining = quota - usage;
      const safetyBuffer = 5 * 1024 * 1024; // 5 MB safety buffer
      if (remaining < neededBytes + safetyBuffer) {
        return { ok: false, remaining };
      }
    }
  } catch {
    // Proceed and handle QuotaExceededError during cache.put if storage is tight.
  }
  return { ok: true };
}

async function downloadSingleFile(cache, item, scope, onChunk) {
  const url = getFileUrl(item.file, scope);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}`), { code: 'NETWORK' });
  }

  const expectedFromServer = Number(response.headers.get('Content-Length') || 0);
  if (expectedFromServer && expectedFromServer !== item.bytes) {
    throw Object.assign(new Error('Size mismatch'), { code: 'INCOMPLETE' });
  }

  let blob;
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength) {
        chunks.push(value);
        received += value.byteLength;
        onChunk(received);
      }
    }
    if (received !== item.bytes) {
      throw Object.assign(new Error('Truncated download'), { code: 'INCOMPLETE' });
    }
    blob = new Blob(chunks, { type: item.type });
  } else {
    blob = await response.blob();
    if (blob.size !== item.bytes) {
      throw Object.assign(new Error('Truncated download'), { code: 'INCOMPLETE' });
    }
    onChunk(blob.size);
  }

  const cachedResponse = new Response(blob, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': item.type,
      'Content-Length': String(blob.size),
      'Accept-Ranges': 'bytes',
      'X-Offline-Complete': '1',
      'X-Offline-Bytes': String(blob.size)
    }
  });

  await cache.put(url, cachedResponse);

  const verified = await isCachedComplete(cache, item, scope);
  if (!verified.ok) {
    await cache.delete(url);
    throw Object.assign(new Error('Verification failed'), { code: 'VERIFY' });
  }
}

export function startOfflineMediaDownload() {
  if (activeDownload) return activeDownload;

  activeDownload = (async () => {
    if (typeof window === 'undefined' || !('caches' in window)) {
      state.storageAvailable = false;
      state.status = 'error';
      state.warning = 'تنبيه: مساحة التخزين بدون إنترنت غير متاحة في هذا المتصفح.';
      state.message = '';
      emit();
      return getOfflineMediaState();
    }

    const scope = getMediaScope();
    let cache;
    try {
      cache = await caches.open(getMediaCacheName(scope));
    } catch {
      state.storageAvailable = false;
      state.status = 'error';
      state.warning = 'تنبيه: تعذّر فتح مساحة التخزين المحلية على هذا الجهاز.';
      state.message = '';
      emit();
      return getOfflineMediaState();
    }

    // Request persistent storage if supported so the browser is less likely to evict cached media.
    try {
      await navigator.storage?.persist?.();
    } catch { /* Optional hint. */ }

    // First verify which files are already stored completely so we never re-download them.
    let baseSavedBytes = 0;
    let savedCount = 0;
    const missing = [];
    const nextMap = {};

    for (const item of OFFLINE_MEDIA) {
      const check = await isCachedComplete(cache, item, scope);
      nextMap[item.file] = check.ok;
      if (check.ok) {
        baseSavedBytes += check.bytes;
        savedCount++;
      } else {
        missing.push(item);
      }
    }

    state.filesStatus = nextMap;
    state.downloadedBytes = baseSavedBytes;
    state.completedFiles = savedCount;
    state.warning = '';
    state.message = '';

    const swReady = await ensureServiceWorkerReady();
    if (!swReady && typeof window !== 'undefined' && window.isSecureContext) {
      state.warning = 'تنبيه: جارٍ تفعيل خدمة العمل بدون إنترنت. إن لم يعمل التشغيل بدون إنترنت، أعد تحميل الصفحة مرة واحدة أثناء الاتصال.';
    }

    if (missing.length === 0) {
      state.status = 'ready';
      state.currentFileTitle = '';
      state.message = OFFLINE_LABELS.success;
      writeDownloadedFlag(true);
      emit();
      return getOfflineMediaState();
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      state.status = 'error';
      state.currentFileTitle = '';
      state.warning = savedCount > 0
        ? 'لا يوجد اتصال بالإنترنت حاليًا. الملفات المحفوظة ما زالت موجودة ويمكنك إكمال تحميل الباقي عند عودة الاتصال.'
        : 'لا يوجد اتصال بالإنترنت حاليًا. اتصل بالإنترنت ثم حاول مرة أخرى.';
      emit();
      return getOfflineMediaState();
    }

    const neededBytes = missing.reduce((sum, item) => sum + item.bytes, 0);
    const quotaCheck = await checkAvailableQuota(neededBytes);
    if (!quotaCheck.ok) {
      state.status = 'error';
      state.currentFileTitle = '';
      state.warning = `تنبيه: المساحة المتاحة في المتصفح (${formatBytesAr(quotaCheck.remaining)}) غير كافية لتحميل الملفات المتبقية (${formatBytesAr(neededBytes)}). يرجى تفريغ مساحة ثم المحاولة مرة أخرى.`;
      emit();
      return getOfflineMediaState();
    }

    state.status = 'downloading';
    emit();

    let completedBytesSoFar = baseSavedBytes;

    try {
      for (const item of missing) {
        state.currentFileTitle = item.title;
        emit();

        await downloadSingleFile(cache, item, scope, fileReceived => {
          state.downloadedBytes = Math.min(TOTAL_MEDIA_BYTES, completedBytesSoFar + fileReceived);
          emit();
        });

        completedBytesSoFar += item.bytes;
        state.filesStatus[item.file] = true;
        state.completedFiles++;
        state.downloadedBytes = completedBytesSoFar;
        emit();
      }
    } catch (error) {
      state.status = 'error';
      state.currentFileTitle = '';
      state.downloadedBytes = completedBytesSoFar;
      const isQuota = error?.name === 'QuotaExceededError';
      state.warning = isQuota
        ? 'تنبيه: امتلأت مساحة التخزين المتاحة على الجهاز. يرجى تفريغ مساحة ثم إعادة المحاولة لاستكمال الملفات المتبقية.'
        : 'انقطع التحميل قبل اكتمال جميع الملفات. الملفات التي تم حفظها محفوظة ولن يُعاد تحميلها عند إعادة المحاولة.';
      state.message = '';
      emit();
      return getOfflineMediaState();
    }

    // Final strict verification across ALL required files before reporting success.
    let verifiedCount = 0;
    let verifiedBytes = 0;
    const verifiedMap = {};
    for (const item of OFFLINE_MEDIA) {
      const check = await isCachedComplete(cache, item, scope);
      verifiedMap[item.file] = check.ok;
      if (check.ok) {
        verifiedCount++;
        verifiedBytes += check.bytes;
      }
    }

    state.filesStatus = verifiedMap;
    state.completedFiles = verifiedCount;
    state.downloadedBytes = verifiedBytes;
    state.currentFileTitle = '';

    if (verifiedCount === OFFLINE_MEDIA.length && verifiedBytes === TOTAL_MEDIA_BYTES) {
      state.status = 'ready';
      state.warning = '';
      state.message = OFFLINE_LABELS.success;
      writeDownloadedFlag(true);
    } else {
      state.status = 'error';
      state.warning = 'لم يكتمل التحقق من جميع الملفات المحفوظة. اضغط لإعادة تحميل الملفات الناقصة.';
      state.message = '';
    }

    emit();
    return getOfflineMediaState();
  })().finally(() => {
    activeDownload = null;
  });

  return activeDownload;
}
