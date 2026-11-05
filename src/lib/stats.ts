// ============================================================
// إحصاءات القراءة: عدّاد يومي + سلسلة الأيام (streak)
// تُخزّن في localStorage عبر useLocalStorage: key = "quranStats"
// ============================================================

export interface DayStat {
  v: number; // آيات قرأها اليوم
  s: number; // سور أتمَّها اليوم
}

export interface StatsData {
  days: Record<string, DayStat>;
}

export const emptyStats: StatsData = { days: {} };

// مفتاح اليوم بصيغة YYYY-MM-DD (بالتاريخ المحلي)
export function dayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function ensureDay(data: StatsData): DayStat {
  const k = dayKey();
  if (!data.days[k]) data.days[k] = { v: 0, s: 0 };
  return data.days[k];
}

export function addVerses(data: StatsData, count = 1): StatsData {
  const next: StatsData = { days: { ...data.days } };
  const k = dayKey();
  const prev = next.days[k] || { v: 0, s: 0 };
  next.days[k] = { ...prev, v: prev.v + count };
  return next;
}

export function addCompletedSurah(data: StatsData): StatsData {
  const next: StatsData = { days: { ...data.days } };
  const k = dayKey();
  const prev = next.days[k] || { v: 0, s: 0 };
  next.days[k] = { ...prev, s: prev.s + 1 };
  return next;
}

export function getDay(data: StatsData, key = dayKey()): DayStat {
  return data.days[key] || { v: 0, s: 0 };
}

// عدد آيات آخر n أيام (شامل اليوم)
export function lastNDaysTotal(data: StatsData, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    total += getDay(data, dayKey(d)).v;
  }
  return total;
}

// سلسلة الأيام المتتالية الحالية (تنتهي اليوم أو بالأمس)
export function currentStreak(data: StatsData): number {
  let streak = 0;
  const today = new Date();
  // إن لم يقرأ شيئاً اليوم انظر من بالأمس (فالسلسلة تقنيّاً ما زالت حيّة)
  const start = getDay(data).v > 0 ? today : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
  for (let i = 0; i < 365; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    if (getDay(data, dayKey(d)).v > 0) streak++;
    else break;
  }
  return streak;
}

// أفضل سلسلة تاريخية
export function bestStreak(data: StatsData): number {
  const keys = Object.keys(data.days).sort();
  let best = 0, cur = 0, prev: Date | null = null;
  for (const k of keys) {
    if (data.days[k].v === 0) continue;
    const [y, m, d] = k.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (prev && (date.getTime() - prev.getTime()) === 86400000) cur++;
    else cur = 1;
    if (cur > best) best = cur;
    prev = date;
  }
  return best;
}

// أسبوع مبسط لعرض شريط صغير (آيات كل يوم من آخر 7 أيام)
export function last7(data: StatsData): { key: string; v: number; label: string }[] {
  const names = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const out: { key: string; v: number; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ key: k, v: getDay(data, k).v, label: names[d.getDay()] });
  }
  return out;
}
