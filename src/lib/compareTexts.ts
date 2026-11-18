// ============================================================
// مقارنة روايتين/نسختين من نص القرآن جنباً إلى جنب
//  مصادر متنوعة: quran.com (أنواع النص) + alquran.cloud (إصدارات)
//  كل النصوص تُجلب من الشبكة وتُخزَّن محلياً (كاش) — بلا سيرفر خاص
// ============================================================

import { normalizeArabicText } from "@/lib/speech";

export interface CompareSource {
  id: string;
  name: string;
  short: string;
}

export const COMPARE_SOURCES: CompareSource[] = [
  { id: "qc:uthmani", name: "عثماني (quran.com)", short: "عثماني" },
  { id: "qc:uthmani_simple", name: "عثماني مبسّط", short: "مبسّط" },
  { id: "qc:uthmani_tajweed", name: "عثماني بعلامات التجويد", short: "تجويد" },
  { id: "qc:imlaei", name: "إملائي (مشكول)", short: "إملائي" },
  { id: "qc:imlaei_simple", name: "إملائي مبسّط", short: "إملائي مبسّط" },
  { id: "aq:quran-uthmani", name: "عثماني (المصحف السعودي)", short: "سعودي" },
  { id: "aq:quran-simple", name: "مقرّر مبسّط", short: "مقرّر" },
  { id: "aq:quran-unicode", name: "يونيكود (علامات موسّعة)", short: "يونيكود" },
  { id: "aq:quran-kids", name: "مصحف الأطفال (كلمة بكلمة)", short: "أطفال" },
];

const CACHE_KEY = "quranCompareTexts_v1";
type TextCache = Record<string, string[]>; // "source:surah" → نص كل آية

function readTextCache(): TextCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeTextCache(c: TextCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* تجاهل */
  }
}

// تنظيف نص الآية من رموز alquran.cloud (BOM) ورموز مصحف الأطفال
function cleanText(raw: string): string {
  let t = raw.replace(/^\uFEFF/, "").trim();
  // مصحف الأطفال: نص عربي ممزوج بأرقام وتفصيلات إنجليزية
  if (/[A-Za-z]{3}/.test(t) && /[\u0600-\u06FF]/.test(t)) {
    t = t
      .replace(/[\x20-\x7E]+/g, " ") // إزالة اللاتينية والأرقام
      .replace(/[|$]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return t;
}

// جلب نص سورة كاملة بمصدر معيّن (مع كاش محلي)
export async function fetchCompareText(sourceId: string, surah: number): Promise<string[]> {
  const key = `${sourceId}:${surah}`;
  const cache = readTextCache();
  if (cache[key]?.length) return cache[key];

  const [kind, id] = sourceId.split(":");
  let texts: string[] = [];

  if (kind === "qc") {
    const res = await fetch(
      `https://api.quran.com/api/v4/quran/verses/${id}?chapter_number=${surah}`
    );
    if (!res.ok) throw new Error("تعذر جلب النص من quran.com");
    const data = await res.json();
    texts = (data.verses || []).map((v: { text: string }) => cleanText(v.text));
  } else {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/${id}`);
    if (!res.ok) throw new Error("تعذر جلب النص من alquran.cloud");
    const data = await res.json();
    texts = (data.data?.ayahs || []).map((a: { text: string }) => cleanText(a.text));
  }

  if (!texts.length) throw new Error("لم يصل نص — تحقق من الاتصال");
  cache[key] = texts;
  writeTextCache(cache);
  return texts;
}

// ==================== مقارنة كلمة-كلمة (LCS) ====================

export interface WordDiff {
  a: { text: string; same: boolean }[];
  b: { text: string; same: boolean }[];
  identical: boolean;
}

// مقارنة كلمات آيتين: الكلمات المتطابقة تبقى عادية والمختلفة تُبرز
export function diffAyahWords(textA: string, textB: string): WordDiff {
  const norm = (s: string) => normalizeArabicText(s.replace(/[\u06DD\u066D\u0660-\u0669]/g, ""));
  const a = textA.replace(/[\u06DD\u066D\u0660-\u0669]/g, "").trim().split(/\s+/).filter(Boolean);
  const b = textB.replace(/[\u06DD\u066D\u0660-\u0669]/g, "").trim().split(/\s+/).filter(Boolean);

  // جدول LCS
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = norm(a[i]) === norm(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  // التتبع: الكلمات المشتركة = نفس LCS
  const sameA = new Array(n).fill(false);
  const sameB = new Array(m).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(a[i]) === norm(b[j])) {
      sameA[i] = true;
      sameB[j] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  const identical = sameA.every(Boolean) && sameB.every(Boolean) && n === m;
  return {
    a: a.map((text, k) => ({ text, same: sameA[k] })),
    b: b.map((text, k) => ({ text, same: sameB[k] })),
    identical,
  };
}
