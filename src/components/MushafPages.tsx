"use client";

import { useCallback, useEffect, useState } from "react";
import type { Ayah } from "@/lib/types";
import { fetchPageVerses, fetchSurahPages } from "@/lib/api";
import { toEasternNumbers } from "@/lib/utils";

// ============================================================
// وضع المصحف بالصفحات — 604 صفحات كالمصحف المطبوع
// يفتح على أول صفحة من السورة الحالية، ويتنقّل بين الصفحات
// مع مؤشر رقم الصفحة والجزء (تُخزَّن الصفحات محلياً للقراءة اللاحقة).
// ============================================================

interface MushafPagesProps {
  surahNumber: number;
  onToast: (m: string) => void;
}

export default function MushafPages({ surahNumber, onToast }: MushafPagesProps) {
  const [page, setPage] = useState<number | null>(null);
  const [verses, setVerses] = useState<Ayah[]>([]);
  const [juz, setJuz] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // عند فتح السورة: انتقل لأول صفحة لها
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [first] = await fetchSurahPages(surahNumber);
        if (alive) setPage(first);
      } catch {
        if (alive) {
          setError("تعذر جلب صفحات المصحف — تحقق من اتصالك");
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [surahNumber]);

  // جلب آيات الصفحة
  useEffect(() => {
    if (page === null) return;
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await fetchPageVerses(page);
        if (!alive) return;
        setVerses(data.verses);
        setJuz(data.juz);
        setLoading(false);
        window.scrollTo({ top: 0 });
      } catch {
        if (alive) {
          setError("تعذر جلب الصفحة — تحقق من اتصالك");
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [page]);

  const nav = useCallback(
    (dir: -1 | 1) => {
      setPage((p) => {
        if (p === null) return p;
        const next = p + dir;
        if (next < 1) {
          onToast("هذه أول صفحة في المصحف");
          return p;
        }
        if (next > 604) {
          onToast("هذه آخر صفحة في المصحف");
          return p;
        }
        return next;
      });
    },
    [onToast]
  );

  return (
    <div>
      {/* شريط التنقل بين الصفحات */}
      <div className="card !rounded-2xl !p-3 mb-4 flex items-center justify-between gap-2">
        <button className="btn-ghost !py-1.5 !px-4 text-xs" onClick={() => nav(1)}>
          الصفحة التالية ⏮
        </button>
        <div className="text-center">
          <p className="font-headings text-lg font-bold text-[var(--gold)]">
            {page !== null && `صفحة ${toEasternNumbers(page)}`}
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            {toEasternNumbers(604)} صفحة
            {juz > 0 && ` · الجزء ${toEasternNumbers(juz)}`}
          </p>
        </div>
        <button className="btn-ghost !py-1.5 !px-4 text-xs" onClick={() => nav(-1)}>
          ⏭ الصفحة السابقة
        </button>
      </div>

      {/* الصفحة */}
      <div className="card !rounded-3xl !p-6 md:!p-10">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="loader-ring" />
            <p className="text-[var(--gold)]">جاري تحميل الصفحة...</p>
          </div>
        ) : error ? (
          <p className="text-center text-[var(--danger)] py-16">{error}</p>
        ) : (
          <p className="ayah-text text-justify" dir="rtl" lang="ar">
            {verses.map((ayah) => {
              const [s, n] = ayah.verse_key.split(":");
              const ayahNum = Number(n);
              const surahChanged =
                Number(s) !==
                (verses[verses.indexOf(ayah) - 1]
                  ? Number(verses[verses.indexOf(ayah) - 1].verse_key.split(":")[0])
                  : Number(s));
              return (
                <span key={ayah.verse_key} id={`ayah-${ayahNum}`} className="ayah-block inline">
                  {surahChanged && ayahNum === 1 && (
                    <span className="block text-center font-quran text-2xl text-[var(--gold)] my-6">
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </span>
                  )}
                  <span className="inline">{ayah.text_uthmani}</span>
                  <span className="ayah-seal">{toEasternNumbers(ayahNum)}</span>{" "}
                </span>
              );
            })}
          </p>
        )}
      </div>

      {/* معلومة */}
      <p className="text-center text-[11px] text-[var(--muted)] opacity-60 mt-4">
        📕 وضع المصحف بالصفحات — مثل المصحف المطبوع تماماً (604 صفحة)
      </p>
    </div>
  );
}
