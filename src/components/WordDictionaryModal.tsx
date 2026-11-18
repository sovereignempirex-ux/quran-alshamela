"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractRoot, searchRoots, ROOTS_COUNT } from "@/lib/rootWords";

// ============================================================
// قاموس جذور الكلمات 💎 — اضغط كلمة في المصحف (نقر مزدوج)
// أو اكتب أي كلمة → الجذر والمعنى (محلياً بالكامل)
// ============================================================

interface DictModalProps {
  initialWord?: string;
  onClose: () => void;
}

export default function WordDictionaryModal({ initialWord = "", onClose }: DictModalProps) {
  const [word, setWord] = useState(initialWord.trim());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialWord) inputRef.current?.focus();
  }, [initialWord]);

  const result = useMemo(() => (word.trim() ? extractRoot(word) : null), [word]);
  const suggestions = useMemo(
    () => (word.trim().length >= 2 && !result ? searchRoots(word).slice(0, 12) : []),
    [word, result]
  );

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,560px)] max-h-[86vh] flex flex-col p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title !text-xl">📖 قاموس جذور الكلمات</h3>
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={onClose}>
            ✕
          </button>
        </div>

        <input
          ref={inputRef}
          className="input text-center font-quran text-lg !py-3 mb-4"
          dir="rtl"
          placeholder="اكتب كلمة من القرآن... مثل: الرحمن"
          value={word}
          onChange={(e) => setWord(e.target.value)}
        />

        <div className="flex-1 overflow-y-auto">
          {result ? (
            <div className="card !p-5 text-center fade-in" style={{ background: "var(--panel)" }}>
              <p className="font-quran text-3xl leading-loose mb-2 text-[var(--gold)]">{word.trim()}</p>
              <div className="flex justify-center gap-4 text-xs text-[var(--muted)] mb-4">
                <span>
                  الجذر:{" "}
                  <b className="font-quran text-lg text-[var(--gold)]">{result.root}</b>
                </span>
              </div>
              <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: "var(--bg)" }}>
                <p className="text-[10px] text-[var(--muted)] mb-1">المعنى المبسّط للجذر</p>
                <p className="text-base leading-8">{result.meaning}</p>
              </div>
              <p className="text-[10px] text-[var(--muted)] mt-4 opacity-70">
                الجذر أصل الكلمة — منه تُشتق المعنى في سياقاتها المختلفة
              </p>
            </div>
          ) : word.trim().length >= 2 ? (
            <div>
              <p className="text-center text-sm text-[var(--muted)] py-4">
                لا يوجد جذر مطابق لكلمة «{word.trim()}» في القاموس المحلي
              </p>
              {suggestions.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-2 text-center">أقرب الجذور:</p>
                  <div className="space-y-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s.root}
                        className="card !p-3 w-full text-right flex items-center justify-between gap-3 hover:border-[var(--gold)] transition-all"
                        onClick={() => setWord(s.root)}
                      >
                        <span className="font-quran text-lg text-[var(--gold)]">{s.root}</span>
                        <span className="text-[11px] text-[var(--muted)] text-left flex-1">
                          {s.meaning}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-[var(--muted)] leading-8">
                ✨ اضغط <b className="text-[var(--gold)]">نقرة مزدوجة</b> على أي كلمة في المصحف
                <br />
                لعرض جذرها ومعناها فوراً هنا
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-4 opacity-70">
                {ROOTS_COUNT} جذراً قرآنياً بمعانٍ مبسّطة — يعمل محلياً بلا إنترنت
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center mt-3">
          <button className="btn-ghost !py-2 text-xs" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </>
  );
}
