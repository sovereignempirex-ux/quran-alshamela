"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { surahData } from "@/lib/surahData";
import { dayKey, getDay, type StatsData } from "@/lib/stats";
import { toEasternNumbers } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// ============================================================
// خطة الختمة (أنجليز الختمة): "ختم القرآن في X يوم"
// يوزّع الآيات على الأيام تلقائياً، ويحدد ورد اليوم بالسورة والآية،
// ويذكّرك بإشعار صامت يومياً إن فعّلته.
// ============================================================

export interface KhatmaPlan {
  start: number; // طابع زمني للبداية
  days: number; // مدة الختمة
}

interface KhatmaPlanCardProps {
  stats: StatsData;
  onOpenSurah: (surah: number, ayah?: number) => void;
}

const TOTAL_AYAHS = 6236;

// مقدمات الآيات التراكمية لكل سورة (constant)
const CUM: number[] = (() => {
  let acc = 0;
  return surahData.map((s) => {
    const start = acc;
    acc += s.verses;
    return start;
  });
})();

function surahOf(globalAyah: number): { surah: number; ayah: number } {
  for (let i = 113; i >= 0; i--) {
    if (globalAyah > CUM[i]) {
      return { surah: i + 1, ayah: globalAyah - CUM[i] };
    }
  }
  return { surah: 1, ayah: 1 };
}

export default function KhatmaPlanCard({ stats, onOpenSurah }: KhatmaPlanCardProps) {
  const planLS = useLocalStorage<KhatmaPlan | null>("quranKhatmaPlan", null);
  const plan = planLS.value;
  const remindLS = useLocalStorage<boolean>("quranKhatmaRemind", false);
  const remind = remindLS.value;
  const [notifNote, setNotifNote] = useState("");
  const [today, setToday] = useState(() => new Date());
  const notifiedRef = useRef<string | null>(null);

  // نبضة كل دقيقة (للتذكير وعدّاد الأيام)
  useEffect(() => {
    const id = setInterval(() => setToday(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const derived = useMemo(() => {
    if (!plan) return null;
    const daily = Math.ceil(TOTAL_AYAHS / plan.days);
    const elapsed = Math.floor((today.getTime() - plan.start) / 86400000);
    const dayIndex = Math.max(0, Math.min(elapsed, plan.days - 1));
    const startAyah = dayIndex * daily + 1;
    const endAyah = Math.min((dayIndex + 1) * daily, TOTAL_AYAHS);
    const from = surahOf(startAyah);
    const to = surahOf(endAyah);
    const daysLeft = Math.max(0, plan.days - elapsed);
    return {
      daily,
      dayIndex,
      from,
      to,
      daysLeft,
      finished: elapsed >= plan.days,
      readToday: getDay(stats).v,
    };
  }, [plan, today, stats]);

  // التذكير اليومي بإشعار صامت (بعد الثانية مساءً إن لم يكتمل الورد)
  useEffect(() => {
    if (!plan || !remind || !derived || derived.finished) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const key = dayKey();
    const todayKey = `khatmaNotified:${key}`;
    if (localStorage.getItem(todayKey)) return;
    const hour = today.getHours();
    if (hour < 14) return; // لا تذكّر قبل العصر
    if (derived.readToday >= derived.daily) {
      localStorage.setItem(todayKey, "1");
      return;
    }
    const remaining = derived.daily - derived.readToday;
    try {
      const n = new Notification("📖 ورد ختمتك اليوم", {
        body: `باقي ${remaining} آية — سورة ${surahData.find((s) => s.number === derived.from.surah)?.name}، آية ${derived.from.ayah}`,
        silent: true,
        tag: "khatma-plan",
      });
      n.addEventListener("close", () => localStorage.setItem(todayKey, "1"));
      setTimeout(() => {
        try { n.close(); } catch { /* تجاهل */ }
      }, 12000);
      notifiedRef.current = key;
    } catch {
      /* تجاهل */
    }
  }, [plan, remind, derived, today]);

  const startPlan = (days: number) => {
    planLS.setValue({ start: new Date().setHours(0, 0, 0, 0), days });
  };

  const toggleRemind = async () => {
    if (!remind) {
      if (typeof Notification === "undefined") {
        setNotifNote("⚠ التنبيهات غير مدعومة على جهازك");
        return;
      }
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setNotifNote("⚠ رفضت صلاحية التنبيهات");
          return;
        }
      }
      setNotifNote("✓ سنعلمك يومياً بعد العصر إن لم تُكمل وردك");
    } else {
      setNotifNote("");
    }
    remindLS.setValue(!remind);
  };

  if (!plan || !derived) {
    return (
      <div className="card !p-6">
        <h3 className="section-title !text-xl mb-2">📅 خطة ختمة القرآن</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          حدّد مدة ختمك وسنوزّع آيات القرآن على أيامك تلقائياً — وورد اليوم محسوب بالسورة والآية.
        </p>
        <div className="flex gap-2 flex-wrap">
          {[15, 30, 60, 90].map((d) => (
            <button key={d} className="btn !py-2 text-sm" onClick={() => startPlan(d)}>
              ختم في {toEasternNumbers(d)} يوماً
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[var(--muted)] mt-3">
          💡 15 يوماً ≈ 416 آية يومياً · 30 يوماً ≈ صفحة ونصف… حدّد بما يناسبك
        </p>
      </div>
    );
  }

  if (derived.finished) {
    return (
      <div className="card !p-6 text-center">
        <p className="text-4xl mb-3">🎉</p>
        <h3 className="section-title !text-xl mb-2">انتهت مدة الخطة!</h3>
        <p className="text-sm text-[var(--muted)] mb-4">
          إن أكملت الختمة فبارك الله فيك — وإن انقطعت فابدأ خطة جديدة وواصل.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button className="btn !py-2 text-sm" onClick={() => startPlan(30)}>
            ابدأ خطة جديدة (30 يوماً)
          </button>
          <button className="btn-ghost !py-2 text-sm" onClick={() => planLS.setValue(null)}>
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card !p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="section-title !text-xl">📅 خطة ختمة القرآن</h3>
        <button
          className="btn-ghost !py-1 !px-3 text-[11px]"
          onClick={() => {
            if (confirm("إلغاء خطة الختمة الحالية؟")) planLS.setValue(null);
          }}
        >
          ✕ إلغاء الخطة
        </button>
      </div>

      {/* ورد اليوم */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: "var(--gold-soft)", border: "1px solid var(--gold)" }}
      >
        <p className="text-xs text-[var(--muted)] mb-1">
          ورد اليوم ({toEasternNumbers(derived.dayIndex + 1)} من {toEasternNumbers(plan.days)}) — باقي{" "}
          {toEasternNumbers(derived.daysLeft)} يوماً لانتهاء الخطة
        </p>
        <p className="font-headings text-lg font-bold text-[var(--gold)]">
          من سورة {surahData.find((s) => s.number === derived.from.surah)?.name} آية{" "}
          {toEasternNumbers(derived.from.ayah)} إلى سورة{" "}
          {surahData.find((s) => s.number === derived.to.surah)?.name} آية{" "}
          {toEasternNumbers(derived.to.ayah)}
        </p>
        <p className="text-[11px] text-[var(--muted)] mt-1">
          ({toEasternNumbers(derived.daily)} آية يومياً)
        </p>
        <button
          className="btn !py-1.5 text-xs mt-3"
          onClick={() => onOpenSurah(derived.from.surah, derived.from.ayah)}
        >
          ابدأ ورد اليوم ←
        </button>
      </div>

      {/* تقدم اليوم */}
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-[var(--muted)]">تقدمك اليوم</span>
        <span className="text-[var(--gold)] font-bold">
          {toEasternNumbers(Math.min(derived.readToday, derived.daily))} / {toEasternNumbers(derived.daily)} آية
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(100, (derived.readToday / derived.daily) * 100)}%`,
          }}
        />
      </div>

      {/* التذكير اليومي */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-[var(--muted)]">🔔 تذكير يومي (إشعار صامت)</span>
        <button
          onClick={toggleRemind}
          className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
            remind
              ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {remind ? "مفعّل" : "معطّل"}
        </button>
      </div>
      {notifNote && <p className="text-[11px] text-[var(--muted)] mt-2">{notifNote}</p>}
    </div>
  );
}
