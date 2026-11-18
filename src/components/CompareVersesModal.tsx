"use client";

import { useEffect, useState } from "react";
import { surahData } from "@/lib/surahData";
import { toEasternNumbers } from "@/lib/utils";
import {
  COMPARE_SOURCES,
  fetchCompareText,
  diffAyahWords,
  type WordDiff,
} from "@/lib/compareTexts";

// ============================================================
// مقارنة روايتين جنباً إلى جنب 💎
//  اختر نسختين + السورة + نطاق الآيات → نص متقابل مع إبراز
//  الاختلافات كلمة-كلمة (LCS) — كل النصوص من الشبكة بكاش محلي
// ============================================================

interface CompareModalProps {
  initialSurah: number;
  initialAyah?: number;
  onClose: () => void;
  onOpenSurah: (surah: number, ayah?: number) => void;
}

export default function CompareVersesModal({
  initialSurah,
  initialAyah,
  onClose,
  onOpenSurah,
}: CompareModalProps) {
  const [surah, setSurah] = useState(initialSurah);
  const [srcA, setSrcA] = useState(COMPARE_SOURCES[0].id);
  const [srcB, setSrcB] = useState(COMPARE_SOURCES[5].id);
  const [from, setFrom] = useState(initialAyah || 1);
  const [to, setTo] = useState(initialAyah || 10);
  const [textsA, setTextsA] = useState<string[]>([]);
  const [textsB, setTextsB] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(true);

  const meta = surahData.find((s) => s.number === surah);
  const ayahCount = meta?.verses || 7;

  // جلب النصين عند تغيير أي معامل
  useEffect(() => {
    let alive = true;
    const a = Math.max(1, Math.min(from, ayahCount));
    const b = Math.max(a, Math.min(to, ayahCount));
    setLoading(true);
    setError(null);
    Promise.all([fetchCompareText(srcA, surah), fetchCompareText(srcB, surah)])
      .then(([ta, tb]) => {
        if (!alive) return;
        if (ta.length !== tb.length) {
          setError("تعذر المقارنة: النسختان لهما عدد آيات مختلف");
          setTextsA([]);
          setTextsB([]);
        } else {
          setTextsA(ta);
          setTextsB(tb);
        }
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "خطأ في الجلب"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, srcA, srcB]);

  const a = Math.max(1, Math.min(from, ayahCount));
  const b = Math.max(a, Math.min(to, ayahCount));
  const range = Array.from({ length: b - a + 1 }, (_, i) => a + i);

  const nameOf = (id: string) => COMPARE_SOURCES.find((s) => s.id === id)?.name || id;

  const renderSide = (words: WordDiff["a"], side: "a" | "b") => (
    <p className="font-quran text-lg leading-9">
      {words.map((w, i) => (
        <span
          key={i}
          className={
            showDiff && !w.same
              ? side === "a"
                ? "diff-a"
                : "diff-b"
              : undefined
          }
        >
          {w.text}{" "}
        </span>
      ))}
    </p>
  );

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(96vw,980px)] max-h-[90vh] flex flex-col p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title !text-xl">⚖️ مقارنة روايتين جنباً إلى جنب</h3>
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* أدوات التحكم */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <select
            className="input !py-2 text-xs"
            value={srcA}
            onChange={(e) => setSrcA(e.target.value)}
            title="الرواية/النسخة الأولى"
          >
            {COMPARE_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                ▶ {s.name}
              </option>
            ))}
          </select>
          <select
            className="input !py-2 text-xs"
            value={srcB}
            onChange={(e) => setSrcB(e.target.value)}
            title="الرواية/النسخة الثانية"
          >
            {COMPARE_SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                ◀ {s.name}
              </option>
            ))}
          </select>
          <select
            className="input !py-2 text-xs"
            value={surah}
            onChange={(e) => {
              const n = Number(e.target.value);
              setSurah(n);
              setFrom(1);
              setTo(Math.min(10, surahData.find((s) => s.number === n)?.verses || 10));
            }}
          >
            {surahData.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <input
              type="number"
              min={1}
              max={ayahCount}
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
              className="input !py-2 text-xs w-1/2"
              title="من آية"
            />
            <input
              type="number"
              min={1}
              max={ayahCount}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
              className="input !py-2 text-xs w-1/2"
              title="إلى آية"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <p className="text-[11px] text-[var(--muted)]">
            🔴 الأحمر = اختلاف بين النسختين · {toEasternNumbers(range.length)} آية معروضة
          </p>
          <div className="flex gap-2">
            <button
              className={`!py-1.5 !px-3 text-xs ${showDiff ? "btn" : "btn-ghost"}`}
              onClick={() => setShowDiff((v) => !v)}
            >
              {showDiff ? "إظهار الاختلافات مفعّل" : "إظهار الاختلافات معطّل"}
            </button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="loader-ring" />
              <p className="text-[var(--gold)] text-sm">جاري جلب النسختين...</p>
            </div>
          )}
          {error && <p className="text-center text-[var(--danger)] py-8 text-sm">{error}</p>}

          {!loading && !error && textsA.length > 0 && (
            <div className="space-y-3">
              {/* رأس الأعمدة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sticky top-0 z-10 py-1" style={{ background: "var(--bg)" }}>
                <p className="text-center text-xs font-bold text-[var(--gold)]">
                  ▶ {nameOf(srcA)}
                </p>
                <p className="text-center text-xs font-bold text-[var(--gold)]">
                  ◀ {nameOf(srcB)}
                </p>
              </div>

              {range.map((n) => {
                const ta = textsA[n - 1];
                const tb = textsB[n - 1];
                if (ta === undefined || tb === undefined) return null;
                const d = diffAyahWords(ta, tb);
                return (
                  <div
                    key={n}
                    className="card !p-4 border-r-2"
                    style={{ borderRightColor: d.identical ? "var(--border)" : "var(--danger)" }}
                  >
                    <button
                      className="text-[10px] text-[var(--gold)] mb-2 hover:underline"
                      onClick={() => {
                        onOpenSurah(surah, n);
                        onClose();
                      }}
                    >
                      آية {toEasternNumbers(n)} ↗ فتحها في المصحف
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div dir="rtl" className="md:border-l md:border-[var(--border)] md:pl-3">
                        {renderSide(d.a, "a")}
                      </div>
                      <div dir="rtl">{renderSide(d.b, "b")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2 mt-3">
          <button className="btn-ghost !py-2 text-xs" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </>
  );
}
