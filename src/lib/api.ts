import type { Ayah, SearchResult, TafsirItem } from "./types";
import { tafsirSources } from "./tafsirSources";

// ============================================================
// طبقة جلب البيانات — تعمل مباشرة من جهاز المستخدم (بدون سيرفر)
// مع نظام ذاكرة محلية (Cache) ليعمل التطبيق دون إنترنت للسور
// والتفاسير التي تم جلبها سابقاً.
// ============================================================

const SURAH_CACHE_KEY = "quranSurahCache_v1";
const TAFSIR_CACHE_KEY = "quranTafsirCache_v1";

type SurahCache = Record<string, Ayah[]>;
type TafsirCache = Record<string, string>;

function readCache<T>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as T;
  } catch {
    return {} as T;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // الذاكرة ممتلئة — نظف الكاش و أعد المحاولة
    try {
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* تجاهل */
    }
  }
}

// ==================== آيات السورة ====================

export async function fetchSurahVerses(surahNumber: number): Promise<Ayah[]> {
  const cache = readCache<SurahCache>(SURAH_CACHE_KEY);
  const cached = cache[surahNumber];

  // إن وجدت مخزنة محلياً عرضها فوراً وبحدّثها بالخلفية
  if (cached && cached.length) {
    refreshSurahInBackground(surahNumber);
    return cached;
  }

  const verses = await fetchSurahRemote(surahNumber);
  cache[surahNumber] = verses;
  writeCache(SURAH_CACHE_KEY, cache);
  return verses;
}

async function fetchSurahRemote(surahNumber: number): Promise<Ayah[]> {
  const res = await fetch(
    `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`
  );
  if (!res.ok) throw new Error("تعذر جلب الآيات، تحقق من اتصالك بالإنترنت");
  const data = await res.json();
  return (data.verses || []).map(
    (v: { id: number; verse_key: string; text_uthmani: string }) => ({
      id: v.id,
      verse_key: v.verse_key,
      text_uthmani: v.text_uthmani,
    })
  );
}

let refreshRunning = false;
async function refreshSurahInBackground(surahNumber: number) {
  if (refreshRunning || typeof navigator === "undefined" || !navigator.onLine) return;
  refreshRunning = true;
  try {
    const verses = await fetchSurahRemote(surahNumber);
    const cache = readCache<SurahCache>(SURAH_CACHE_KEY);
    cache[surahNumber] = verses;
    writeCache(SURAH_CACHE_KEY, cache);
  } catch {
    /* لا يهم — لدينا نسخة محلية */
  } finally {
    refreshRunning = false;
  }
}

// ==================== البحث ====================

export async function searchQuranApi(
  q: string,
  page = 1,
  size = 10
): Promise<{ results: SearchResult[]; total: number; totalPages: number; page: number }> {
  const res = await fetch(
    `https://api.quran.com/api/v4/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`
  );
  if (!res.ok) throw new Error("تعذر البحث، تحقق من اتصالك بالإنترنت");
  const data = await res.json();
  const raw = data?.search?.results || [];
  const results: SearchResult[] = raw.map(
    (r: {
      verse_key: string;
      text: string;
      words?: { text: string; highlight: boolean; char_type: string }[];
    }) => {
      const [surahStr, ayahStr] = r.verse_key.split(":");
      const surahNumber = Number(surahStr);
      return {
        verse_key: r.verse_key,
        text: r.text,
        words: r.words || [],
        surahNumber,
        ayahNumber: Number(ayahStr),
        surahName: `سورة ${surahNumber}`,
      };
    }
  );
  return {
    results,
    total: data?.search?.total_results || 0,
    totalPages: data?.search?.total_pages || 1,
    page,
  };
}

// (يُعاير اسم السورة في المكوّن من بيانات السور المحلية)

// ==================== التفسير ====================

export async function fetchTafsir(
  surah: number,
  ayah: number,
  edition: string
): Promise<TafsirItem> {
  const cache = readCache<TafsirCache>(TAFSIR_CACHE_KEY);
  const cacheKey = `${edition}:${surah}:${ayah}`;
  const sourceInfo = tafsirSources.find((t) => t.edition === edition) || tafsirSources[0];

  const cached = cache[cacheKey];
  if (cached) {
    return {
      tafsirId: sourceInfo.id,
      tafsirName: sourceInfo.name,
      surahName: "",
      surahNumber: surah,
      numberInSurah: ayah,
      text: cached,
    };
  }

  const res = await fetch(
    `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/${sourceInfo.edition}`
  );
  if (!res.ok) throw new Error("لا يوجد تفسير متاح لهذه الآية أو تعذر الاتصال");
  const data = await res.json();
  const text: string = data?.data?.text || "";
  if (!text) throw new Error("لا يوجد تفسير متاح لهذه الآية");

  cache[cacheKey] = text;
  writeCache(TAFSIR_CACHE_KEY, cache);

  return {
    tafsirId: sourceInfo.id,
    tafsirName: sourceInfo.name,
    surahName: data?.data?.surah?.name || "",
    surahNumber: surah,
    numberInSurah: data?.data?.numberInSurah || ayah,
    text,
  };
}

// ==================== الترجمة الإنجليزية ====================

const TRANS_CACHE_KEY = "quranTransCache_v1";

export async function fetchTranslation(
  surahNumber: number
): Promise<Record<number, string>> {
  const cache = readCache<Record<string, Record<number, string>>>(TRANS_CACHE_KEY);
  const hit = cache[surahNumber];
  if (hit) return hit;

  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/en.asad`
  );
  if (!res.ok) throw new Error("تعذر جلب الترجمة، تحقق من اتصالك بالإنترنت");
  const data = await res.json();
  const ayahs = data?.data?.ayahs || [];
  const out: Record<number, string> = {};
  for (const a of ayahs) {
    // إزالة رموز الحواشي [12] من نص الترجمة
    out[a.numberInSurah] = String(a.text || "").replace(/\[\d+\]/g, "").trim();
  }
  cache[surahNumber] = out;
  writeCache(TRANS_CACHE_KEY, cache);
  return out;
}

// ==================== مواقيت الصلاة ====================

const MAKKAH = { lat: 21.4225, lon: 39.8262 };

export interface PrayerTimesData {
  timings: Record<string, string>;
  hijri?: { day: string; month: string; year: string } | null;
  meta?: { timezone?: string; method?: string };
}

export async function fetchPrayerTimes(
  lat?: number,
  lon?: number
): Promise<PrayerTimesData> {
  const la = lat || MAKKAH.lat;
  const lo = lon || MAKKAH.lon;
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const date = `${dd}-${mm}-${now.getFullYear()}`;

  const res = await fetch(
    `https://api.aladhan.com/v1/timings/${date}?latitude=${la}&longitude=${lo}&method=4`
  );
  if (!res.ok) throw new Error("تعذر جلب مواقيت الصلاة");
  const data = await res.json();
  const t = data?.data?.timings;
  if (!t) throw new Error("بيانات المواقيت غير مكتملة");

  return {
    timings: {
      Fajr: t.Fajr,
      Sunrise: t.Sunrise,
      Dhuhr: t.Dhuhr,
      Asr: t.Asr,
      Maghrib: t.Maghrib,
      Isha: t.Isha,
    },
    hijri: data?.data?.date?.hijri
      ? {
          day: data.data.date.hijri.day,
          month: data.data.date.hijri.month.ar,
          year: data.data.date.hijri.year,
        }
      : null,
    meta: {
      timezone: data?.data?.meta?.timezone,
      method: data?.data?.meta?.method?.name,
    },
  };
}

// ==================== آية اليوم ====================

export interface VerseOfDayData {
  surahNumber: number;
  surahName: string;
  surahEnglish: string;
  ayahNumber: number;
  text: string;
  tafsir: string | null;
  type: string;
}

export async function fetchVerseOfDay(): Promise<VerseOfDayData> {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const seed = dayOfYear * 7919 + new Date().getFullYear() * 31;
  const ayahGlobal = (seed % 6236) + 1;

  const res = await fetch(
    `https://api.alquran.cloud/v1/ayah/${ayahGlobal}/editions/quran-uthmani,ar.muyassar`
  );
  if (!res.ok) throw new Error("تعذر جلب آية اليوم");
  const data = await res.json();
  const uthmani = data?.data?.[0];
  const tafsir = data?.data?.[1];
  if (!uthmani) throw new Error("بيانات آية اليوم غير موجودة");

  return {
    surahNumber: uthmani.surah.number,
    surahName: uthmani.surah.name.replace("سُورَةُ ", "").trim(),
    surahEnglish: uthmani.surah.englishName,
    ayahNumber: uthmani.numberInSurah,
    text: uthmani.text,
    tafsir: tafsir?.text || null,
    type: uthmani.surah.revelationType === "Meccan" ? "مكية" : "مدنية",
  };
}
