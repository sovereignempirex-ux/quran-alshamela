"use client";

import { useEffect, useMemo, useState } from "react";
import { surahData } from "@/lib/surahData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { dueReviews, topWrongWords, surahGrade, MEDAL_LABEL, type SurahGrade } from "@/lib/review";
import { toEasternNumbers } from "@/lib/utils";

// ============================================================
// دفتري 📓 — الدراسات الشخصية كلها في مكان واحد:
//  ملاحظاتي (مثبتة على الآيات) · سجل ما قرأته من التفاسير
//  · كلماتي الخاطئة (من التسميع) · مراجعة اليوم (المتباعدة)
//  · درجات الحفظ لكل سورة (برونزي→ذهبي)
// ============================================================

interface NotebookProps {
  onClose: () => void;
  onOpenSurah: (surah: number, ayah?: number) => void;
  onToast: (m: string) => void;
}

interface Note {
  surah: number;
  ayah: number;
  text: string;
  t: number;
}

interface TafsirLog {
  t: number;
  surah: number;
  ayah: number;
  source: string;
}

type Tab = "notes" | "tafsir" | "words" | "review" | "grades";

export function useTafsirLog() {
  const logLS = useLocalStorage<TafsirLog[]>("quranTafsirLog", []);
  return logLS;
}

// يسجّل مشاهدة تفسير آية (تستدعى من نافذة التفسير)
export function logTafsirView(surah: number, ayah: number, source: string): void {
  try {
    const raw = localStorage.getItem("quranTafsirLog");
    const log: TafsirLog[] = raw ? JSON.parse(raw) : [];
    const entry = { t: Date.now(), surah, ayah, source };
    localStorage.setItem(
      "quranTafsirLog",
      JSON.stringify([entry, ...log.filter((l) => !(l.surah === surah && l.ayah === ayah))].slice(0, 80))
    );
  } catch {
    /* تجاهل */
  }
}

export default function NotebookModal({ onClose, onOpenSurah, onToast }: NotebookProps) {
  const notesLS = useLocalStorage<Note[]>("quranStudyNotes", []);
  const notes = notesLS.value;
  const [tab, setTab] = useState<Tab>("notes");
  const [draft, setDraft] = useState("");
  const [draftTarget, setDraftTarget] = useState<{ surah: number; ayah: number } | null>(null);
  const tafsirLog = useLocalStorage<TafsirLog[]>("quranTafsirLog", []).value;

  const due = useMemo(() => dueReviews(12), []);
  const wrong = useMemo(() => topWrongWords(15), []);

  const addNote = () => {
    const text = draft.trim();
    if (!text || !draftTarget) return;
    notesLS.setValue([{ ...draftTarget, text, t: Date.now() }, ...notes]);
    setDraft("");
    setDraftTarget(null);
    onToast("📓 أُضيفت الملاحظة إلى دفترك");
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "notes", label: "📝 ملاحظاتي" },
    { id: "tafsir", label: "📜 سجل التفاسير" },
    { id: "words", label: "🗣 كلماتي الخاطئة" },
    { id: "review", label: "🔄 مراجعة اليوم" },
    { id: "grades", label: "🏅 درجات الحفظ" },
  ];

  const nameOf = (n: number) => surahData.find((s) => s.number === n)?.name || "";

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,620px)] max-h-[86vh] flex flex-col p-5 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title !text-xl">📓 دفتري</h3>
          <button className="btn-ghost !px-3 !py-1 text-xs" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`shrink-0 !py-1.5 !px-3 text-xs ${tab === t.id ? "btn" : "btn-ghost"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* الملاحظات */}
          {tab === "notes" && (
            <div>
              <div className="mb-4">
                <p className="text-xs text-[var(--muted)] mb-2">
                  📌 الملاحظات تُضاف من نافذة التفسير لكل آية، وتظهر هنا مجمّعة
                </p>
                {draftTarget && (
                  <div className="mb-2 p-3 rounded-xl" style={{ background: "var(--panel)" }}>
                    <p className="text-xs text-[var(--gold)] mb-2">
                      ملاحظة جديدة على سورة {nameOf(draftTarget.surah)} آية {toEasternNumbers(draftTarget.ayah)}
                    </p>
                    <textarea
                      className="input w-full text-sm !py-2"
                      rows={3}
                      dir="rtl"
                      value={draft}
                      placeholder="اكتب ملاحظتك هنا..."
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="btn !py-1.5 text-xs" onClick={addNote}>
                        حفظ
                      </button>
                      <button
                        className="btn-ghost !py-1.5 text-xs"
                        onClick={() => {
                          setDraftTarget(null);
                          setDraft("");
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {notes.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted)] py-8">
                  لا ملاحظات بعد — افتح تفسير أي آية وأضف ملاحظتك
                </p>
              ) : (
                <div className="space-y-2">
                  {notes.map((nt, i) => (
                    <div key={i} className="card !p-4">
                      <button
                        className="text-xs text-[var(--gold)] mb-1 hover:underline"
                        onClick={() => {
                          onOpenSurah(nt.surah, nt.ayah);
                          onClose();
                        }}
                      >
                        سورة {nameOf(nt.surah)} — آية {toEasternNumbers(nt.ayah)} ↗
                      </button>
                      <p className="text-sm leading-7 whitespace-pre-wrap">{nt.text}</p>
                      <button
                        className="text-[10px] text-[var(--danger)] mt-2 opacity-70 hover:opacity-100"
                        onClick={() => notesLS.setValue(notes.filter((_, j) => j !== i))}
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* سجل التفاسير */}
          {tab === "tafsir" && (
            <div>
              {tafsirLog.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted)] py-8">
                  لم تقرأ تفسيراً بعد — كل تفسير تفتحه يُسجَّل هنا
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tafsirLog.map((l, i) => (
                    <button
                      key={i}
                      className="card !p-3 w-full text-right flex items-center justify-between gap-3 hover:border-[var(--gold)] transition-all"
                      onClick={() => {
                        onOpenSurah(l.surah, l.ayah);
                        onClose();
                      }}
                    >
                      <span className="text-sm">
                        سورة {nameOf(l.surah)} — آية {toEasternNumbers(l.ayah)}
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">
                        {l.source} · {new Date(l.t).toLocaleDateString("ar-EG")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* الكلمات الخاطئة */}
          {tab === "words" && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-3">
                🗣 كلمات تخطئ فيها كثيراً في تسميعك — راجعها وثبّتها:
              </p>
              {wrong.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted)] py-8">
                  لا أخطاء مسجلة — جرّب 🎤 التسميع الصوتي وسيبدأ تتبع أخطائك تلقائياً
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {wrong.map((w) => (
                    <button
                      key={w.word}
                      className="card !px-4 !py-2 text-right hover:border-[var(--gold)] transition-all"
                      onClick={() => {
                        const [s, a] = w.verseKey.split(":");
                        onOpenSurah(Number(s), Number(a));
                        onClose();
                      }}
                    >
                      <span className="font-quran text-lg text-[var(--danger)]">{w.word}</span>
                      <span className="text-[10px] text-[var(--muted)] block">
                        خطأت فيها {toEasternNumbers(w.count)} مرة — اضغط للذهاب للآية
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* مراجعة اليوم (متباعدة) */}
          {tab === "review" && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-3">
                🔄 آيات تحتاج مراجعة اليوم — المراجعة المتباعدة تعيدها لك قبل أن تُنسى
              </p>
              {due.length === 0 ? (
                <p className="text-center text-sm text-[var(--muted)] py-8">
                  لا مراجعات مستحقة الآن 🎉 — اختبر نفسك من 🎯 اختبار الحفظ أو 🎤 التسميع
                </p>
              ) : (
                <div className="space-y-1.5">
                  {due.map((d) => {
                    const [s, a] = d.verseKey.split(":");
                    return (
                      <button
                        key={d.verseKey}
                        className="card !p-3 w-full text-right flex items-center justify-between gap-3 hover:border-[var(--gold)] transition-all"
                        onClick={() => {
                          onOpenSurah(Number(s), Number(a));
                          onClose();
                        }}
                      >
                        <span className="text-sm">
                          سورة {nameOf(Number(s))} — آية {toEasternNumbers(Number(a))}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">
                          آخر نتيجة {toEasternNumbers(d.score)}٪ · أفضل {toEasternNumbers(d.best)}٪
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* درجات الحفظ */}
          {tab === "grades" && <GradesList />}
        </div>
      </div>
    </>
  );
}

// درجات الحفظ لكل سورة (برونزي → ذهبي)
function GradesList() {
  const [grades, setGrades] = useState<{ n: number; g: SurahGrade }[]>([]);
  useEffect(() => {
    const out = surahData
      .map((s) => ({ n: s.number, g: surahGrade(s.number, s.verses) }))
      .filter((x) => x.g.graded > 0);
    setGrades(out);
  }, []);

  if (!grades.length) {
    return (
      <p className="text-center text-sm text-[var(--muted)] py-8">
        لم تقيّم أي آية بعد — من 🎯 اختبار الحفظ أو 🎤 التسميع تنال درجاتك
        <br />
        <span className="text-[11px] mt-2 block opacity-70">
          80٪ من آيات السورة بنتيجة 90٪+ = 🥇 ذهبي
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {grades.map(({ n, g }) => (
        <div key={n} className="card !p-3 flex items-center justify-between gap-3">
          <span className="text-sm font-headings">{surahData.find((s) => s.number === n)?.name}</span>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
            <span>
              {toEasternNumbers(g.graded)}/{toEasternNumbers(g.total)} آية
            </span>
            <span className="text-[var(--gold)]">{toEasternNumbers(g.best)}٪</span>
            <span className="w-16 text-left">{MEDAL_LABEL[g.medal] || "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
