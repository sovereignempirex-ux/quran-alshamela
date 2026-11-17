"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { adhkarGroups, type DhkarGroup } from "@/lib/adhkar";
import { asmaHusna } from "@/lib/asma";
import { dayKey } from "@/lib/stats";
import { toEasternNumbers } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// ============================================================
// قسم الأذكار 📿 — أذكار الصباح والمساء والنوم والاستيقاظ
// + سيد الاستغفار + دعاء الختمة + أسماء الله الحسنى (99)
// كلها أوفلاين بعدّاد تنفيذ يومي لكل ذكر
// ============================================================

interface AdhkarSectionProps {
  onToast: (m: string) => void;
}

// عدّادات اليوم: مفتاح "adhkarProgress:YYYY-MM-DD"
type Progress = Record<string, number>; // "groupId:itemIndex" → عدد مرات المنجزة

export default function AdhkarSection({ onToast }: AdhkarSectionProps) {
  const [tab, setTab] = useState<"adhkar" | "asma">("adhkar");
  const [groupIdx, setGroupIdx] = useState(0);
  const progressLS = useLocalStorage<Progress>(`adhkarProgress:${dayKey()}`, {});
  const setProgressLS = progressLS.setValue;
  const progress = progressLS.value;
  const group = adhkarGroups[Math.min(groupIdx, adhkarGroups.length - 1)];

  // نبضة: عند تغيّر اليوم تُصفَّر العدّادات ليبدأ اليوم الجديد
  const todayRef = useRef(dayKey());
  useEffect(() => {
    const id = setInterval(() => {
      const k = dayKey();
      if (k !== todayRef.current) {
        todayRef.current = k;
        setProgressLS({});
      }
    }, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneCount = (g: DhkarGroup) =>
    g.items.filter((_, i) => (progress[`${g.id}:${i}`] || 0) >= g.items[i].count).length;

  const bump = (itemIndex: number) => {
    const key = `${group.id}:${itemIndex}`;
    const target = group.items[itemIndex].count;
    const next = Math.min(target, (progress[key] || 0) + 1);
    setProgressLS({ ...progress, [key]: next });
    if (navigator.vibrate) navigator.vibrate(12);
    if (next === target) {
      const all = group.items.every(
        (_, i) => (progress[`${group.id}:${i}`] || 0) >= group.items[i].count || i === itemIndex
      );
      if (all) onToast("✨ أتممت " + group.title + " — تقبل الله منك");
    }
  };

  const totalItems = adhkarGroups.reduce((a, g) => a + g.items.length, 0);
  const doneItems = adhkarGroups.reduce((a, g) => a + doneCount(g), 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* تبويبان: أذكار / أسماء الله الحسنى */}
      <div className="flex gap-2 justify-center mb-5">
        <button
          className={`!py-2 !px-6 text-sm ${tab === "adhkar" ? "btn" : "btn-ghost"}`}
          onClick={() => setTab("adhkar")}
        >
          📿 الأذكار
        </button>
        <button
          className={`!py-2 !px-6 text-sm ${tab === "asma" ? "btn" : "btn-ghost"}`}
          onClick={() => setTab("asma")}
        >
          🌟 أسماء الله الحسنى
        </button>
      </div>

      {tab === "adhkar" ? (
        <>
          {/* ملخص اليوم */}
          <div className="card !p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-[var(--muted)]">
              أذكارك اليوم:{" "}
              <span className="text-[var(--gold)] font-bold">
                {toEasternNumbers(doneItems)} / {toEasternNumbers(totalItems)}
              </span>{" "}
              ذكراً
            </p>
            <div className="progress-bar flex-1 min-w-[120px] max-w-xs">
              <div
                className="progress-fill"
                style={{ width: `${(doneItems / Math.max(1, totalItems)) * 100}%` }}
              />
            </div>
          </div>

          {/* اختيار مجموعة الأذكار */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {adhkarGroups.map((g, i) => (
              <button
                key={g.id}
                className={`shrink-0 px-4 py-2 rounded-full text-xs transition-all border ${
                  i === groupIdx
                    ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)] font-bold"
                    : "bg-[var(--panel)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)]"
                }`}
                onClick={() => setGroupIdx(i)}
              >
                {g.icon} {g.title}
                {doneCount(g) === g.items.length && " ✓"}
              </button>
            ))}
          </div>

          <p className="text-xs text-[var(--muted)] mb-4 text-center">{group.when}</p>

          {/* أذكار المجموعة */}
          <div className="space-y-3">
            {group.items.map((item, i) => {
              const key = `${group.id}:${i}`;
              const cur = progress[key] || 0;
              const done = cur >= item.count;
              return (
                <div
                  key={i}
                  className="card !p-4 transition-all"
                  style={done ? { borderColor: "var(--gold)", background: "var(--gold-soft)" } : undefined}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <h3 className="font-headings font-bold text-[var(--gold)] text-sm">
                      {done && "✓ "}
                      {item.title}
                    </h3>
                    {item.count > 1 && (
                      <span className="text-[11px] text-[var(--muted)]">
                        {toEasternNumbers(item.count)} مرات
                      </span>
                    )}
                  </div>
                  <p className="text-base md:text-lg leading-loose text-justify" dir="rtl" lang="ar">
                    {item.text}
                  </p>
                  {item.source && (
                    <p className="text-[11px] text-[var(--muted)] mt-2 opacity-75">✦ {item.source}</p>
                  )}
                  {/* العدّاد */}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      className={`!py-1.5 !px-4 text-xs ${done ? "btn-ghost" : "btn"}`}
                      onClick={() => bump(i)}
                      disabled={done}
                    >
                      {done
                        ? "أتممته ✓"
                        : item.count > 1
                        ? `عدّ (${toEasternNumbers(cur)}/${toEasternNumbers(item.count)}) +`
                        : "أتممته +"}
                    </button>
                    {item.count > 1 && !done && (
                      <div className="progress-bar flex-1 max-w-[160px]">
                        <div
                          className="progress-fill"
                          style={{ width: `${(cur / item.count) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <AsmaGrid />
      )}
    </div>
  );
}

// ==================== شبكة أسماء الله الحسنى ====================
function AsmaGrid() {
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      asmaHusna.filter(
        (a) =>
          !query.trim() ||
          a.name.includes(query.trim()) ||
          a.meaning.includes(query.trim()) ||
          String(a.n) === query.trim()
      ),
    [query]
  );

  return (
    <div>
      <p className="text-xs text-[var(--muted)] text-center mb-3">
        «وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا» — الأعراف ١٨٠
      </p>
      <input
        className="input w-full !py-2 text-sm mb-4"
        placeholder="ابحث بالاسم أو المعنى أو الرقم..."
        dir="rtl"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((a) => (
          <button
            key={a.n}
            onClick={() => setOpenIdx(openIdx === a.n ? null : a.n)}
            className="card !p-3 text-center cursor-pointer hover:border-[var(--gold)] transition-all"
            style={openIdx === a.n ? { borderColor: "var(--gold)" } : undefined}
          >
            <p className="text-[10px] text-[var(--muted)]">{toEasternNumbers(a.n)}</p>
            <p className="font-quran text-xl text-[var(--gold)]">{a.name}</p>
            {openIdx === a.n && (
              <p className="text-[11px] text-[var(--muted)] mt-2 leading-5">{a.meaning}</p>
            )}
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-[var(--muted)] text-sm py-10">لا نتائج مطابقة</p>
      )}
      <p className="text-center text-[11px] text-[var(--muted)] opacity-60 mt-4">
        💡 اضغط الاسم لعرض معناه
      </p>
    </div>
  );
}
