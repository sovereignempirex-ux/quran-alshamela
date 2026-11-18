"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";
import { searchQuranApi } from "@/lib/api";
import { expandQuery } from "@/lib/concepts";
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
  // البحث الدلالي: توسعة محلية بمترادفات المفاهيم
  const [semantic, setSemantic] = useState<{ label: string; terms: string[]; count: number } | null>(null);
  const [semanticKeys, setSemanticKeys] = useState<Set<string>>(new Set());
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
      setSemantic(null);
      setSemanticKeys(new Set());
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // الاستعلام الأساسي + توسعة دلالية محلية (مترادفات المفاهيم)
      const { terms, group } = expandQuery(q);
      const [main, ...extras] = await Promise.all([
        searchQuranApi(q, p),
        ...terms.slice(0, 3).map((t) => searchQuranApi(t, 1, 8).catch(() => null)),
      ]);
      const map = (rs: SearchResult[]) =>
        rs.map((r) => {
          const meta = surahData.find((s) => s.number === r.surahNumber);
          return meta ? { ...r, surahName: meta.name } : r;
        });
      const merged = map(main.results);
      const seen = new Set(merged.map((r) => r.verse_key));
      const semKeys = new Set<string>();
      for (const ex of extras) {
        if (!ex) continue;
        for (const r of map(ex.results)) {
          if (!seen.has(r.verse_key)) {
            seen.add(r.verse_key);
            merged.push(r);
            semKeys.add(r.verse_key);
          }
        }
      }
      setResults(merged);
      setSemanticKeys(semKeys);
      setSemantic(
        group && semKeys.size > 0
          ? { label: group.label, terms: terms.slice(0, 3), count: semKeys.size }
          : null
      );
      setTotal(main.total || 0);
      setPage(main.page || p);
      setTotalPages(main.totalPages || 1);
      setSearched(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في البحث");
      setResults([]);
      setSemantic(null);
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
          <p className="text-center text-sm text-[var(--muted)] mb-3">
            {total > 0
              ? `وُجد ${toEasternNumbers(total)} نتيجة للبحث عن «${searched}»`
              : `لا توجد نتائج للبحث عن «${searched}»`}
          </p>
        )}

        {/* توسعة دلالية: نتائج إضافية من مترادفات المعنى */}
        {!loading && semantic && (
          <div
            className="rounded-2xl px-4 py-3 mb-5 border border-[var(--border)] text-center"
            style={{ background: "var(--panel)" }}
          >
            <p className="text-xs text-[var(--gold)] mb-2">
              🔎 بحث بالمعنى — مجموعة «{semantic.label}»: بحثنا أيضاً عن{" "}
              {semantic.terms.map((t) => `«${t}»`).join("، ")}
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              + {toEasternNumbers(semantic.count)} نتيجة إضافية مرتبطة بالمعنى نفسه
            </p>
          </div>
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
                  {semanticKeys.has(r.verse_key) && (
                    <span className="text-[10px] font-normal mr-2 px-2 py-0.5 rounded-full border border-[var(--gold)] text-[var(--gold)]">
                      🔎 بالمعنى
                    </span>
                  )}
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
