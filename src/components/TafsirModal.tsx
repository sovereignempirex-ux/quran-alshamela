"use client";

import { useEffect, useState } from "react";
import type { TafsirItem } from "@/lib/types";
import { fetchTafsir } from "@/lib/api";
import { tafsirSources } from "@/lib/tafsirSources";
import { toEasternNumbers } from "@/lib/utils";
import { getSurahByNumber } from "@/lib/surahData";
import { logTafsirView } from "@/components/NotebookModal";

interface TafsirModalProps {
  surah: number;
  ayah: number;
  onClose: () => void;
  onNavigate: (nextAyah: number) => void;
}

export default function TafsirModal({
  surah,
  ayah,
  onClose,
  onNavigate,
}: TafsirModalProps) {
  const [source, setSource] = useState(tafsirSources[0].edition);
  const [data, setData] = useState<TafsirItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const meta = getSurahByNumber(surah);
  const maxAyah = meta?.verses || 1;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    setNoteSaved(false);
    setNoteDraft("");
    (async () => {
      try {
        const json = await fetchTafsir(surah, ayah, source);
        if (!alive) return;
        setData({
          ...json,
          surahName: json.surahName || getSurahByNumber(surah)?.name || "",
        });
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "تعذر جلب التفسير");
      } finally {
        if (alive) setLoading(false);
      }
      if (alive) logTafsirView(surah, ayah, tafsirSources.find((t) => t.edition === source)?.name || source);
    })();
    return () => {
      alive = false;
    };
  }, [surah, ayah, source]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />

      <div
        className="modal-box right-1/2 translate-x-1/2 flex flex-col"
        style={{
          width: "min(94vw, 620px)",
          maxHeight: "86vh",
          inset: 0,
          margin: "auto",
        }}
      >
        {/* رأس النافذة */}
        <div className="flex items-center justify-between gap-2 p-4 flex-wrap border-b border-[var(--border)]">
          <h3 className="font-headings font-bold text-lg text-[var(--gold)]">
            🧠 تفسير الآية {toEasternNumbers(ayah)}
          </h3>

          <div className="flex items-center gap-2">
            <select
              className="input !py-1.5 !w-auto text-xs"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {tafsirSources.map((t) => (
                <option key={t.edition} value={t.edition}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={onClose}
              title="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* الجسم */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-14">
              <div className="loader-ring" />
              <p className="text-[var(--gold)] text-sm">جاري جلب التفسير...</p>
            </div>
          ) : error ? (
            <p className="text-center text-[var(--danger)] py-10">{error}</p>
          ) : data ? (
            <div>
              <p className="text-center text-xs text-[var(--muted)] mb-4">
                سورة {data.surahName} · {data.tafsirName}
              </p>
              <p className="tafsir-body">{data.text}</p>

              {/* ملاحظة شخصية تُخزَّن في دفتري */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                {noteSaved ? (
                  <p className="text-xs text-[var(--gold)]">✓ حُفظت الملاحظة في دفترك 📓</p>
                ) : (
                  <>
                    <details>
                      <summary className="text-xs text-[var(--gold)] cursor-pointer mb-2">
                        📌 أضف ملاحظة على هذه الآية
                      </summary>
                      <textarea
                        className="input w-full text-sm !py-2"
                        rows={2}
                        dir="rtl"
                        placeholder="ملاحظتك، فائدة تعلمتها، أو فهمك الخاص..."
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                      />
                      <button
                        className="btn !py-1.5 text-xs mt-2"
                        disabled={!noteDraft.trim()}
                        onClick={() => {
                          try {
                            const raw = localStorage.getItem("quranStudyNotes");
                            const notes = raw ? JSON.parse(raw) : [];
                            notes.unshift({ surah, ayah, text: noteDraft.trim(), t: Date.now() });
                            localStorage.setItem("quranStudyNotes", JSON.stringify(notes));
                            setNoteSaved(true);
                            setNoteDraft("");
                          } catch {
                            /* تجاهل */
                          }
                        }}
                      >
                        حفظ في دفتري
                      </button>
                    </details>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* التنقل بين الآيات */}
        <div className="flex items-center justify-between p-3 border-t border-[var(--border)] gap-2">
          <button
            className="btn-ghost !py-1.5 text-xs"
            disabled={ayah <= 1}
            onClick={() => onNavigate(ayah - 1)}
            style={{ opacity: ayah <= 1 ? 0.4 : 1 }}
          >
            → التفسير السابق (آية {toEasternNumbers(Math.max(ayah - 1, 1))})
          </button>
          <button
            className="btn-ghost !py-1.5 text-xs"
            disabled={ayah >= maxAyah}
            onClick={() => onNavigate(ayah + 1)}
            style={{ opacity: ayah >= maxAyah ? 0.4 : 1 }}
          >
            التفسير التالي (آية {toEasternNumbers(Math.min(ayah + 1, maxAyah))}) ←
          </button>
        </div>
      </div>
    </>
  );
}
