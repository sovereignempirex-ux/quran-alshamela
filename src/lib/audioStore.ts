// ============================================================
// مخزن التلاوات المحلية (IndexedDB) — يعمل على الويب وويندوز وأندرويد
// يسمح للمستخدم بتنزيل تلاوات قارئه المفضلة كاملة والاستماع إليها
// بدون إنترنت إطلاقاً (وضع الأوفلاين 100%).
// ============================================================

import { pad3 } from "./utils";

const DB_NAME = "quranAudioDB";
const STORE = "audio";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export function audioKey(reciter: string, surah: number): string {
  return `${reciter}:${surah}`;
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  return db.transaction(STORE, mode).objectStore(STORE);
}

function reqToPromise<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export interface OfflineTrack {
  surah: number;
  size: number; // بايت
}

// هل التلاوة محفوظة محلياً؟
export async function getOfflineAudio(
  reciter: string,
  surah: number
): Promise<Blob | null> {
  try {
    const store = await getStore("readonly");
    const rec = await reqToPromise<OfflineRecord | undefined>(
      store.get(audioKey(reciter, surah))
    );
    return rec ? rec.blob : null;
  } catch {
    return null;
  }
}

interface OfflineRecord {
  id: string;
  blob: Blob;
  size: number;
  reciter: string;
  surah: number;
  savedAt: number;
}

export async function saveOfflineAudio(
  reciter: string,
  surah: number,
  blob: Blob
): Promise<void> {
  const store = await getStore("readwrite");
  const rec: OfflineRecord = {
    id: audioKey(reciter, surah),
    blob,
    size: blob.size,
    reciter,
    surah,
    savedAt: Date.now(),
  };
  await reqToPromise(store.put(rec));
}

export async function deleteOfflineAudio(
  reciter: string,
  surah: number
): Promise<void> {
  const store = await getStore("readwrite");
  await reqToPromise(store.delete(audioKey(reciter, surah)));
}

// قائمة سور قارئ محفوظة محلياً (بأحجامها)
export async function listOfflineReciter(
  reciter: string
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  try {
    const store = await getStore("readonly");
    const range = IDBKeyRange.bound(
      `${reciter}:`,
      `${reciter}:\uffff`,
      false,
      false
    );
    const req = store.openCursor(range);
    return await new Promise((resolve) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return resolve(out);
        const rec = cursor.value as OfflineRecord;
        out.set(rec.surah, rec.size);
        cursor.continue();
      };
      req.onerror = () => resolve(out);
    });
  } catch {
    return out;
  }
}

// حذف كل تلاوات قارئ
export async function deleteOfflineReciter(reciter: string): Promise<void> {
  const store = await getStore("readwrite");
  const range = IDBKeyRange.bound(`${reciter}:`, `${reciter}:\uffff`);
  await reqToPromise(store.delete(range));
}

// حذف كل التلاوات المحفوظة (كل القرّاء)
export async function clearOfflineAll(): Promise<void> {
  const store = await getStore("readwrite");
  await reqToPromise(store.clear());
}

// إحصاء استهلاك التخزين
export async function storageUsage(): Promise<{ usage: number; quota: number }> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage || 0, quota: est.quota || 0 };
    }
  } catch {
    /* غير مدعوم */
  }
  return { usage: 0, quota: 0 };
}

// ============================================================
// تنزيل سورة مع تقرير التقدم (بدون سيرفر — مباشرة من جهاز المستخدم)
// ============================================================

export async function downloadSurahAudio(
  reciterId: string,
  server: string,
  surah: number,
  onProgress?: (received: number, total: number) => void
): Promise<void> {
  const base = server.endsWith("/") ? server : `${server}/`;
  const res = await fetch(`${base}${pad3(surah)}.mp3`);
  if (!res.ok) throw new Error(`فشل تنزيل السورة ${surah} (${res.status})`);

  const total = Number(res.headers.get("content-length") || 0);

  // بدون stream (متصفحات قديمة)
  if (!res.body) {
    const blob = await res.blob();
    if (blob.size < 10000) throw new Error("ملف غير صالح");
    onProgress?.(blob.size, blob.size);
    await saveOfflineAudio(reciterId, surah, blob);
    return;
  }

  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as unknown as BlobPart);
    received += value.byteLength;
    onProgress?.(received, total);
  }

  const blob = new Blob(chunks, { type: "audio/mpeg" });
  if (blob.size < 10000) throw new Error("ملف غير صالح");
  await saveOfflineAudio(reciterId, surah, blob);
}

// تنسيق حجم مقروء
export function formatBytes(bytes: number): string {
  if (!bytes) return "0 ب";
  const units = ["ب", "ك.ب", "م.ب", "ج.ب"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// ============================================================
// حزمة السورة كاملة (نص + تلاوة + تفسير الميسّر + ترجمة) — بزر واحد
// بعد الحفظ تعمل السورة كاملة بدون إنترنت إطلاقاً.
// ============================================================
export async function downloadSurahPackage(
  reciterId: string,
  server: string,
  surah: number,
  helpers: {
    fetchText: () => Promise<unknown>; // يجلب نص الآيات ويخزنه محلياً (مع كاش)
    fetchTafsir: () => Promise<unknown>;
    fetchTranslation: () => Promise<unknown>;
  },
  onProgress?: (received: number, total: number) => void
): Promise<void> {
  // النص والتفسير والترجمة بالتوازي مع الصوت
  await Promise.all([
    downloadSurahAudio(reciterId, server, surah, onProgress).catch((e) => {
      throw e; // الصوت هو الأهم — إن فشل فشلت الحزمة
    }),
    helpers.fetchText().catch(() => undefined),
    helpers.fetchTafsir().catch(() => undefined),
    helpers.fetchTranslation().catch(() => undefined),
  ]);
}
