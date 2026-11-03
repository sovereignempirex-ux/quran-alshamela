"use client";

import { useState } from "react";
import type { BookmarkAyah, FavoriteSurah, SectionId } from "@/lib/types";
import { toEasternNumbers } from "@/lib/utils";

interface FavoritesSectionProps {
  favorites: FavoriteSurah[];
  bookmarks: BookmarkAyah[];
  onOpenSurah: (n: number) => void;
  onOpenAyah: (surahNumber: number, ayahNumber: number) => void;
  onToggleFavorite: (s: FavoriteSurah) => void;
  onToggleAyahBookmark: (
    surahNumber: number,
    ayahNumber: number,
    text: string
  ) => void;
  onGoto: (s: SectionId) => void;
}

export default function FavoritesSection({
  favorites,
  bookmarks,
  onOpenSurah,
  onOpenAyah,
  onToggleFavorite,
  onToggleAyahBookmark,
  onGoto,
}: FavoritesSectionProps) {
  const [tab, setTab] = useState<"surahs" | "ayahs">("surahs");

  return (
    <div className="fade-in">
      <h2 className="section-title text-center mb-5">❤️ المفضلة والحفظ</h2>

      {/* تبويبات */}
      <div className="flex justify-center gap-3 mb-8">
        <button
          className={`px-6 py-2.5 rounded-full text-sm transition-all border ${
            tab === "surahs"
              ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)] font-bold"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold)]"
          }`}
          onClick={() => setTab("surahs")}
        >
          📖 السور ({toEasternNumbers(favorites.length)})
        </button>
        <button
          className={`px-6 py-2.5 rounded-full text-sm transition-all border ${
            tab === "ayahs"
              ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)] font-bold"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold)]"
          }`}
          onClick={() => setTab("ayahs")}
        >
          🔖 الآيات المحفوظة ({toEasternNumbers(bookmarks.length)})
        </button>
      </div>

      {tab === "surahs" && (
        <>
          {favorites.length === 0 ? (
            <EmptyHint text="لا توجد سور مفضلة بعد — افتح قائمة السور واضغط على 🤍 لإضافة سورة">
              <button className="btn mt-4" onClick={() => onGoto("surahs")}>
                تصفح السور
              </button>
            </EmptyHint>
          ) : (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
              {favorites.map((s) => (
                <div key={s.number} className="card card-hover relative">
                  <button
                    className="absolute top-3 left-3 text-lg hover:scale-110 transition-transform"
                    title="إزالة من المفضلة"
                    onClick={() => onToggleFavorite(s)}
                  >
                    ✕
                  </button>
                  <h3 className="font-headings text-2xl font-bold text-[var(--gold)] mb-1">
                    {s.name}
                  </h3>
                  <p className="text-xs text-[var(--muted)] mb-4">
                    {s.type} · {toEasternNumbers(s.verses)} آية
                  </p>
                  <button
                    className="btn w-full text-sm"
                    onClick={() => onOpenSurah(s.number)}
                  >
                    فتح السورة ←
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "ayahs" && (
        <>
          {bookmarks.length === 0 ? (
            <EmptyHint text="لا توجد آيات محفوظة — أثناء القراءة اضغط على أي آية واختر «حفظ الآية»">
              <button className="btn mt-4" onClick={() => onGoto("surahs")}>
                ابدأ القراءة
              </button>
            </EmptyHint>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {bookmarks.map((b) => (
                <div key={`${b.surahNumber}:${b.ayahNumber}`} className="card relative">
                  <button
                    className="absolute top-3 left-3 text-[var(--danger)] text-lg hover:scale-110 transition-transform"
                    title="إزالة"
                    onClick={() =>
                      onToggleAyahBookmark(b.surahNumber, b.ayahNumber, b.text)
                    }
                  >
                    ✕
                  </button>

                  <p className="font-quran text-xl leading-9 mt-4">{b.text}</p>

                  <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                    <span className="text-xs text-[var(--gold)] font-bold">
                      سورة {b.surahName} — آية {toEasternNumbers(b.ayahNumber)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="btn-ghost !py-1.5 text-xs"
                        onClick={() => onOpenAyah(b.surahNumber, b.ayahNumber)}
                      >
                        فتح الموضع
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyHint({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="text-center py-20">
      <p className="text-5xl mb-4">🌙</p>
      <p className="text-[var(--muted)] max-w-md mx-auto leading-7">{text}</p>
      {children}
    </div>
  );
}
