"use client";

import { useEffect, useMemo, useState } from "react";
import type { Ayah, SurahMeta } from "@/lib/types";
import { toEasternNumbers } from "@/lib/utils";
import { recordAyahResult } from "@/lib/review";

// ============================================================
// اختبار الحفظ (تسميع تفاعلي):
// يطرح آية من السورة الحالية — تظهر أول كلمة فقط، والمستخدم
// يكشف الكلمات واحداً واحداً ليقارن حفظه، ثم نقيّم أداءه تلقائياً.
// ============================================================

interface MemorizeQuizProps {
  surah: SurahMeta;
  ayahs: Ayah[];
  onClose: () => void;
}

interface QuizState {
  index: number;
  revealed: number; // عدد الكلمات المكشوفة (عدا الأولى)
}

function randomIndex(len: number, exclude?: number): number {
  if (len <= 1) return 0;
  let i = Math.floor(Math.random() * len);
  if (i === exclude) i = (i + 1) % len;
  return i;
}

export default function MemorizeQuizModal({ surah, ayahs, onClose }: MemorizeQuizProps) {
  const [state, setState] = useState<QuizState>(() => ({
    index: randomIndex(ayahs.length),
    revealed: 0,
  }));
  const [graded, setGraded] = useState(false);

  const ayah = ayahs[Math.min(state.index, ayahs.length - 1)];
  const ayahNumber = ayah ? Number(ayah.verse_key.split(":")[1]) : 0;

  // كلمات الآية (نزع علامة رقم الآية "۝" ورموزها)
  const words = useMemo(
    () =>
      ayah
        ? ayah.text_uthmani
            .replace(/[\u06DD\u066D\u0660-\u0669]+/g, "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
        : [],
    [ayah]
  );

  const totalHidden = Math.max(0, words.length - 1); // الأولى مكشوفة دائماً
  const done = state.revealed >= totalHidden;

  // إظهار الآية بالتقييم عند اكتمال الكشف + تسجيل النتيجة في نظام المراجعة
  useEffect(() => {
    if (done && !graded) {
      setGraded(true);
      const verseKey = `${surah.number}:${ayahNumber}`;
      const score = Math.round(
        (1 - state.revealed / Math.max(1, totalHidden)) * 100
      );
      recordAyahResult(verseKey, score);
    }
  }, [done, graded]);

  const nextAyah = () => {
    setState({ index: randomIndex(ayahs.length, state.index), revealed: 0 });
    setGraded(false);
  };

  if (!ayah) return null;

  // بناء عرض الكلمات: الأولى دائماً مكشوفة، والبقية حسب الكشف
  const renderWord = (w: string, i: number) => {
    if (i === 0 || i <= state.revealed) {
      return <span key={i}>{w}</span>;
    }
    return (
      <span key={i} className="text-[var(--gold)] opacity-30 select-none" aria-hidden>
        {"٭"}
      </span>
    );
  };

  const rating =
    state.revealed === 0
      ? { text: "ممتاز! حفظت الآية كاملة أول مرة 🌟", color: "var(--gold)" }
      : state.revealed <= totalHidden * 0.25
      ? { text: `رائع — كشفت ${toEasternNumbers(state.revealed)} كلمة فقط 👏`, color: "var(--gold)" }
      : state.revealed <= totalHidden * 0.6
      ? { text: `جيد — كشفت ${toEasternNumbers(state.revealed)} كلمة. راجع الآية`, color: "var(--text)" }
      : { text: `كشفت ${toEasternNumbers(state.revealed)} كلمة — تحتاج لمراجعة هذه الآية`, color: "var(--danger)" };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,560px)] p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title !text-xl">🎯 اختبار الحفظ</h3>
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="text-xs text-[var(--muted)] mb-1">
          سورة {surah.name} — الآية {toEasternNumbers(ayahNumber)} من {toEasternNumbers(surah.verses)}
        </p>

        {/* نص الآية (الأولى مكشوفة والبقية مبهمة) */}
        <div
          className="rounded-2xl p-5 my-4 border border-[var(--border)] cursor-pointer"
          style={{ background: "var(--panel)" }}
          onClick={() =>
            !done && setState((s) => ({ ...s, revealed: s.revealed + 1 }))
          }
        >
          <p className="ayah-text text-center leading-loose" dir="rtl">
            {words.map((w, i) => renderWord(w, i))}
          </p>
        </div>

        {graded ? (
          <p className="text-center text-sm font-bold mb-4" style={{ color: rating.color }}>
            {rating.text}
          </p>
        ) : (
          <p className="text-center text-[11px] text-[var(--muted)] mb-4">
            💡 اضغط النص لكشف الكلمة التالية وقارن بحفظك
          </p>
        )}

        <div className="flex gap-2 justify-center flex-wrap">
          {!done && (
            <button
              className="btn !py-2 text-sm"
              onClick={() => setState((s) => ({ ...s, revealed: s.revealed + 1 }))}
            >
              كشف كلمة ➜
            </button>
          )}
          {!done && (
            <button
              className="btn-ghost !py-2 text-sm"
              onClick={() => setState((s) => ({ ...s, revealed: totalHidden }))}
            >
              كشف الآية كاملة
            </button>
          )}
          <button className="btn-ghost !py-2 text-sm" onClick={nextAyah}>
            🔄 آية أخرى
          </button>
        </div>
      </div>
    </>
  );
}
