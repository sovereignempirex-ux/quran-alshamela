// ============================================================
// نظام الحفظ والمراجعة — يعمل كلياً محلياً (localStorage)
//  - تقييم تسميع الآيات (اختبار الحفظ + التسميع الصوتي)
//  - مراجعة متباعدة: الآيات الضعيفة تعود للمراجعة أسرع
//  - تتبع الأخطاء المتكررة: كلمات تخطئ فيها كثيراً
//  - درجات الحفظ لكل سورة: برونزي / فضي / ذهبي
// ============================================================

export interface AyahGrade {
  score: number; // آخر نتيجة 0..100
  best: number; // أفضل نتيجة
  attempts: number;
  due: number; // طابع زمني لموعد المراجعة
  interval: number; // فاصل الأيام الحالي
}

export interface WrongWord {
  count: number;
  last: number;
  verseKey: string;
}

export interface ReviewData {
  grades: Record<string, AyahGrade>; // "سورة:آية"
  wrongWords: Record<string, WrongWord>; // كلمة مُطبَّعة → بيانات
  log: { t: number; verseKey: string; score: number }[]; // آخر الأحداث
}

export const emptyReview: ReviewData = { grades: {}, wrongWords: {}, log: [] };

export const REVIEW_KEY = "quranReview";

// قراءة بيانات المراجعة
export function readReview(): ReviewData {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    if (!raw) return emptyReview;
    return { ...emptyReview, ...JSON.parse(raw) };
  } catch {
    return emptyReview;
  }
}

export function writeReview(data: ReviewData): void {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(data));
  } catch {
    /* تجاهل */
  }
}

const DAY = 86400000;
// فواصل المراجعة المتباعدة (يوم): تسير أسرع مع النجاح، وترجع للأول عند الفشل
const INTERVALS = [1, 2, 4, 8, 16, 32];

// تسجيل نتيجة تسميع/اختبار لآية
export function recordAyahResult(verseKey: string, score: number, wrongNorms: string[] = []): void {
  const data = readReview();
  const prev = data.grades[verseKey];
  const fail = score < 60;
  const interval = prev
    ? fail
      ? INTERVALS[0]
      : INTERVALS[Math.min(INTERVALS.length - 1, prev.interval < INTERVALS[0] ? 0 : INTERVALS.indexOf(prev.interval) + 1)]
    : fail
    ? INTERVALS[0]
    : INTERVALS[1];
  data.grades[verseKey] = {
    score,
    best: Math.max(score, prev?.best ?? 0),
    attempts: (prev?.attempts || 0) + 1,
    due: Date.now() + interval * DAY,
    interval,
  };
  for (const w of wrongNorms) {
    const ww = data.wrongWords[w] || { count: 0, last: 0, verseKey };
    data.wrongWords[w] = { count: ww.count + 1, last: Date.now(), verseKey };
  }
  data.log = [{ t: Date.now(), verseKey, score }, ...data.log].slice(0, 60);
  writeReview(data);
}

// تسجيل كلمات خاطئة فقط (دون تغيير نتيجة أي آية)
export function recordWrongWords(norms: string[], verseKey: string): void {
  if (!norms.length) return;
  const data = readReview();
  for (const w of norms) {
    const ww = data.wrongWords[w] || { count: 0, last: 0, verseKey };
    data.wrongWords[w] = { count: ww.count + 1, last: Date.now(), verseKey };
  }
  writeReview(data);
}

// مراجعات مستحقة الآن (مرتبة: الأكثر استحقاقاً أولاً)
export function dueReviews(limit = 10): { verseKey: string; score: number; best: number }[] {
  const data = readReview();
  const now = Date.now();
  return Object.entries(data.grades)
    .filter(([, g]) => g.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, limit)
    .map(([verseKey, g]) => ({ verseKey, score: g.score, best: g.best }));
}

// أكثر الكلمات الخاطئة تكراراً
export function topWrongWords(limit = 12): { word: string; count: number; verseKey: string }[] {
  const data = readReview();
  return Object.entries(data.wrongWords)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([word, w]) => ({ word, count: w.count, verseKey: w.verseKey }));
}

// درجة الحفظ لسورة: نسبة الآيات المقيمة + متوسط أفضل النتائج
export interface SurahGrade {
  graded: number;
  total: number;
  best: number; // 0..100 متوسط أفضل النتائج
  medal: "none" | "bronze" | "silver" | "gold";
}

export function surahGrade(surahNumber: number, ayahCount: number): SurahGrade {
  const data = readReview();
  const grades = Object.entries(data.grades).filter(([k]) => k.startsWith(`${surahNumber}:`));
  const graded = grades.length;
  const avg = graded
    ? Math.round(grades.reduce((a, [, g]) => a + g.best, 0) / graded)
    : 0;
  const medal: SurahGrade["medal"] =
    graded && avg >= 90 && graded >= Math.ceil(ayahCount * 0.8)
      ? "gold"
      : graded && avg >= 70 && graded >= Math.ceil(ayahCount * 0.5)
      ? "silver"
      : graded && avg >= 50
      ? "bronze"
      : "none";
  return { graded, total: ayahCount, best: avg, medal };
}

export const MEDAL_LABEL: Record<SurahGrade["medal"], string> = {
  none: "",
  bronze: "🥉 برونزي",
  silver: "🥈 فضي",
  gold: "🥇 ذهبي",
};
