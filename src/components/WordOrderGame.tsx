"use client";

import { useMemo, useState } from "react";
import type { Ayah, SurahMeta } from "@/lib/types";
import { toEasternNumbers } from "@/lib/utils";

// ============================================================
// لعبة تركيب الكلمات 🧩 — تخلط كلمات الآية وترتّبها بالضغط
// اضغط كلمتين لتبديل مكانهما حتى يستقيم الترتيب
// ============================================================

interface WordGameProps {
  surah: SurahMeta;
  ayahs: Ayah[];
  onClose: () => void;
  onToast: (m: string) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function WordOrderGame({ surah, ayahs, onClose, onToast }: WordGameProps) {
  const [ayahIdx, setAyahIdx] = useState(() => Math.floor(Math.random() * ayahs.length));
  const ayah = ayahs[Math.min(ayahIdx, ayahs.length - 1)];
  const ayahNumber = ayah ? Number(ayah.verse_key.split(":")[1]) : 0;

  // كلمات الآية
  const correct = useMemo(
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

  // اختيار آية قصيرة كفاية للعبة (5-14 كلمة)
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const [tiles, setTiles] = useState<{ word: string; origIdx: number }[]>(() => {
    const ay = ayahs[Math.min(ayahIdx, ayahs.length - 1)];
    let words = ay.text_uthmani.replace(/[\u06DD\u066D\u0660-\u0669]+/g, "").trim().split(/\s+/).filter(Boolean);
    if (words.length > 14) words = words.slice(0, 12);
    return shuffle(words.map((word, origIdx) => ({ word, origIdx })));
  });
  const [tries, setTries] = useState(0);
  const [won, setWon] = useState(false);

  // إعادة التهيئة عند تغيير الآية
  const pick = (idx: number) => {
    setAyahIdx(idx);
    setWon(false);
    setTries(0);
    setLockedIdx(null);
    const ay = ayahs[idx];
    let words = ay.text_uthmani.replace(/[\u06DD\u066D\u0660-\u0669]+/g, "").trim().split(/\s+/).filter(Boolean);
    if (words.length > 14) words = words.slice(0, 12); // مقطع أول لآيات طويلة
    setTiles(shuffle(words.map((word, origIdx) => ({ word, origIdx }))));
  };

  const swap = (i: number) => {
    if (lockedIdx === null) {
      setLockedIdx(i);
      return;
    }
    if (lockedIdx === i) {
      setLockedIdx(null);
      return;
    }
    const next = [...tiles];
    [next[lockedIdx], next[i]] = [next[i], next[lockedIdx]];
    setTiles(next);
    setLockedIdx(null);
    setTries((t) => t + 1);
    const solved = next.every((t, k) => t.origIdx === k);
    if (solved) {
      setWon(true);
      onToast("🧩 أحسنت! ركّبت الآية بشكل صحيح");
    }
  };

  if (!ayah) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,600px)] max-h-[86vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="section-title !text-xl">🧩 لعبة تركيب الكلمات</h3>
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="text-xs text-[var(--muted)] mb-4">
          سورة {surah.name} — آية {toEasternNumbers(ayahNumber)} من {toEasternNumbers(surah.verses)} ·
          اضغط كلمتين لتبديل مكانهما حتى يستقيم الترتيب
          {correct.length > 14 && " (يُلعب بأول 12 كلمة من الآية الطويلة)"}
        </p>

        {/* المربعات */}
        <div
          className="rounded-2xl p-4 mb-4 border border-[var(--border)]"
          style={{ background: "var(--panel)" }}
        >
          <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
            {tiles.map((t, i) => (
              <button
                key={i}
                onClick={() => !won && swap(i)}
                className={`rounded-xl px-3 py-2 font-quran text-lg leading-8 transition-all border ${
                  lockedIdx === i
                    ? "!border-[var(--gold)] bg-[var(--gold-soft)] scale-105"
                    : "border-transparent"
                }`}
                style={{ background: lockedIdx === i ? undefined : "var(--panel-solid)" }}
              >
                {t.word}
              </button>
            ))}
          </div>
        </div>

        {won && (
          <p className="text-center text-sm text-[var(--gold)] font-bold mb-4">
            ✨ ركّبت الآية في {toEasternNumbers(tries)} محاولة — والله أعلم بحفظك
          </p>
        )}

        <div className="flex gap-2 justify-center flex-wrap">
          {!won && (
            <button
              className="btn-ghost !py-2 text-xs"
              onClick={() => pick(ayahIdx)}
              title="خلط الكلمات من جديد"
            >
              🔄 أعد الخلط
            </button>
          )}
          {won && (
            <button className="btn !py-2 text-xs" onClick={() => pick(Math.floor(Math.random() * ayahs.length))}>
              ⏭ آية أخرى
            </button>
          )}
          <button className="btn-ghost !py-2 text-xs" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </>
  );
}
