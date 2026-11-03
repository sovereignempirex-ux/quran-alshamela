"use client";

import { useMemo, useState } from "react";
import type { FavoriteSurah, SurahMeta } from "@/lib/types";
import { surahData } from "@/lib/surahData";
import { toEasternNumbers } from "@/lib/utils";

interface SurahGridProps {
  favorites: FavoriteSurah[];
  completed: number[];
  onOpen: (n: number) => void;
  onToggleFavorite: (s: SurahMeta) => void;
  isFavorite: (n: number) => boolean;
}

type SortMode = "default" | "longest" | "shortest";

export default function SurahGrid({
  favorites,
  completed,
  onOpen,
  onToggleFavorite,
  isFavorite,
}: SurahGridProps) {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("default");
  const [onlyMakki, setOnlyMakki] = useState<null | boolean>(null);

  const list = useMemo(() => {
    let data = surahData.filter((s) => {
      const matchText =
        !filter ||
        s.name.includes(filter) ||
        s.englishName.toLowerCase().includes(filter.toLowerCase()) ||
        s.englishNameTranslation.toLowerCase().includes(filter.toLowerCase()) ||
        String(s.number) === filter.replace("سورة", "").trim();
      const matchType = onlyMakki === null || s.type === (onlyMakki ? "مكية" : "مدنية");
      return matchText && matchType;
    });

    if (sortBy === "longest") data = [...data].sort((a, b) => b.verses - a.verses);
    if (sortBy === "shortest") data = [...data].sort((a, b) => a.verses - b.verses);
    return data;
  }, [filter, sortBy, onlyMakki]);

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h2 className="section-title">📖 قائمة السور</h2>
        <span className="text-xs text-[var(--muted)]">
          {toEasternNumbers(list.length)} من {toEasternNumbers(114)} سورة
        </span>
      </div>

      {/* أدوات التصفية */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        <input
          className="input !rounded-full flex-1 min-w-[220px]"
          placeholder="ابحث عن سورة بالاسم أو الرقم..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <select
          className="input !rounded-full !w-auto text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortMode)}
        >
          <option value="default">الترتيب الافتراضي</option>
          <option value="longest">الأطول أولاً</option>
          <option value="shortest">الأقصر أولاً</option>
        </select>

        <div className="flex rounded-full border border-[var(--border)] overflow-hidden text-xs">
          {(
            [
              { v: null, label: "الكل" },
              { v: true, label: "مكية" },
              { v: false, label: "مدنية" },
            ] as const
          ).map((o) => (
            <button
              key={String(o.v)}
              onClick={() => setOnlyMakki(o.v)}
              className={`px-4 py-2.5 transition-all ${
                onlyMakki === o.v
                  ? "bg-[var(--gold)] text-[var(--bg)] font-bold"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* الشبكة */}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {list.map((s) => {
          const fav = isFavorite(s.number);
          const inFavs = favorites.some((f) => f.number === s.number);
          return (
            <div
              key={s.number}
              className="card card-hover relative overflow-hidden cursor-pointer"
              onClick={() => onOpen(s.number)}
            >
              {/* توهج عند المرور */}
              <div
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: "radial-gradient(300px 120px at 70% 0%, var(--gold-soft), transparent)" }}
              />

              {completed.includes(s.number) && (
                <span
                  className="absolute top-4 right-3 text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "var(--gold)", color: "var(--bg)" }}
                >
                  ✅ أتممت
                </span>
              )}

              <div
                className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: "var(--gold)", color: "var(--bg)" }}
              >
                {s.number}
              </div>

              <button
                className="absolute top-3 left-16 text-lg transition-transform hover:scale-125 z-10"
                title={fav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(s);
                }}
              >
                {fav ? "❤️" : "🤍"}
              </button>

              <div className="mt-6">
                <h3 className="font-headings text-2xl font-bold text-[var(--gold)] mb-1">
                  {s.name}
                </h3>
                <p className="text-xs text-[var(--muted)] mb-3" dir="ltr">
                  {s.englishName} · {s.englishNameTranslation}
                </p>
                <div className="flex gap-2 flex-wrap text-[11px]">
                  <span className="meta-tag">{s.type}</span>
                  <span className="meta-tag">{toEasternNumbers(s.verses)} آية</span>
                  {inFavs && <span className="meta-tag">⭐ مفضلة</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <p className="text-center text-[var(--muted)] py-16 text-lg">
          لا توجد نتائج مطابقة لبحثك
        </p>
      )}
    </div>
  );
}
