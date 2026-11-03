"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";
import { searchQuranApi } from "@/lib/api";
import { surahData } from "@/lib/surahData";
import { toEasternNumbers } from "@/lib/utils";

interface SearchSectionProps {
  onOpenSurah: (surahNumber: number, ayahNumber?: number) => void;
}

export default function SearchSection({ onOpenSurah }: SearchSectionProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState<string>("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // بحث فوري مع مهلة
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(1), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function doSearch(p: number) {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setTotal(0);
      setSearched("");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchQuranApi(q, p);
      // اربط نتيجتنا بأسماء السور المحلية
      const mapped = data.results.map((r) => {
        const meta = surahData.find((s) => s.number === r.surahNumber);
        return meta ? { ...r, surahName: meta.name } : r;
      });
      setResults(mapped);
      setTotal(data.total || 0);
      setPage(data.page || p);
      setTotalPages(data.totalPages || 1);
      setSearched(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في البحث");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  // تظليل كلمات البحث داخل نص الآية
  function renderHighlightedText(r: SearchResult) {
    const hits = (r.words || [])
      .filter((w) => w.char_type !== "end")
      .map((w) => ({ text: w.text, hit: !!w.highlight }));
    if (!hits.length) return <span>{r.text}</span>;
    return (
      <>
        {hits.map((w, i) => (
          <span key={i} className={w.hit ? "quran-hit" : ""}>
            {w.text}{" "}
          </span>
        ))}
      </>
    );
  }

  return (
    <div className="fade-in">
      <h2 className="section-title text-center mb-6">🔍 البحث في القرآن الكريم</h2>

      <div className="max-w-2xl mx-auto">
        <input
          className="input !rounded-full text-lg !py-4 text-center"
          placeholder="اكتب كلمة أو جزءاً من آية... مثل: الرحمن"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch(1)}
          autoFocus
        />
        {query.trim().length > 0 && query.trim().length < 2 && (
          <p className="text-center text-xs text-[var(--muted)] mt-2">
            اكتب حرفين على الأقل
          </p>
        )}
      </div>

      <div className="max-w-3xl mx-auto mt-8">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="loader-ring" />
            <p className="text-[var(--gold)]">جاري البحث...</p>
          </div>
        )}

        {error && (
          <p className="text-center text-[var(--danger)] py-8">{error}</p>
        )}

        {!loading && !error && searched && (
          <p className="text-center text-sm text-[var(--muted)] mb-5">
            {total > 0
              ? `وُجد ${toEasternNumbers(total)} نتيجة للبحث عن «${searched}»`
              : `لا توجد نتائج للبحث عن «${searched}»`}
          </p>
        )}

        <div className="space-y-4">
          {results.map((r) => (
            <div
              key={r.verse_key}
              className="card card-hover cursor-pointer"
              onClick={() => onOpenSurah(r.surahNumber, r.ayahNumber)}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-xs font-bold text-[var(--gold)]">
                  سورة {r.surahName}
                </span>
                <span className="text-[11px] text-[var(--muted)]">{r.verse_key}</span>
              </div>
              <p className="font-quran text-xl leading-9">
                {renderHighlightedText(r)}
                <span className="ayah-seal">{toEasternNumbers(r.ayahNumber)}</span>
              </p>
              <p className="mt-3 text-[11px] text-[var(--muted)] opacity-70">
                اضغط لفتح السورة والاستماع من موضع الآية
              </p>
            </div>
          ))}
        </div>

        {/* ترقيم الصفحات */}
        {totalPages > 1 && !loading && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              className="btn-ghost !py-1.5 text-xs"
              disabled={page <= 1}
              onClick={() => doSearch(page - 1)}
              style={{ opacity: page <= 1 ? 0.4 : 1 }}
            >
              السابقة →
            </button>
            <span className="text-xs text-[var(--muted)]">
              صفحة {toEasternNumbers(page)} من {toEasternNumbers(totalPages)}
            </span>
            <button
              className="btn-ghost !py-1.5 text-xs"
              disabled={page >= totalPages}
              onClick={() => doSearch(page + 1)}
              style={{ opacity: page >= totalPages ? 0.4 : 1 }}
            >
              ← التالية
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
