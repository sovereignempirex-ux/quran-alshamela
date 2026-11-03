"use client";

import { useEffect, useState } from "react";
import type { LastRead, SectionId } from "@/lib/types";
import { fetchVerseOfDay } from "@/lib/api";
import PrayerTimesCard from "@/components/PrayerTimesCard";
import KhatmaCard from "@/components/KhatmaCard";
import { surahData } from "@/lib/surahData";

interface VerseOfDayData {
  surahNumber: number;
  surahName: string;
  surahEnglish: string;
  ayahNumber: number;
  text: string;
  tafsir: string | null;
  type: string;
}

interface HomeSectionProps {
  lastRead: LastRead | null;
  onContinue: (lr: LastRead) => void;
  onOpenSurah: (n: number) => void;
  onGoto: (s: SectionId) => void;
  khatmaCompleted: number[];
  onResetKhatma: () => void;
}

export default function HomeSection({
  lastRead,
  onContinue,
  onOpenSurah,
  onGoto,
  khatmaCompleted,
  onResetKhatma,
}: HomeSectionProps) {
  const [odayVerse, setOdayVerse] = useState<VerseOfDayData | null>(null);
  const [odayLoading, setOdayLoading] = useState(true);
  const [showTafsir, setShowTafsir] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchVerseOfDay();
        if (alive) setOdayVerse(data);
      } catch {
        /* تجاهل */
      }
      if (alive) setOdayLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const quickPick = [
    { n: 1, name: "الفاتحة" },
    { n: 18, name: "الكهف" },
    { n: 36, name: "يس" },
    { n: 55, name: "الرحمن" },
    { n: 67, name: "الملك" },
    { n: 2, name: "البقرة" },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* البوابة الرئيسية */}
      <div
        className="rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(26,35,126,0.45) 0%, rgba(13,20,33,0.25) 100%)",
          border: "1px solid var(--gold)",
        }}
      >
        <div className="bismillah !mb-4">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <h2 className="font-headings text-3xl md:text-4xl font-bold gold-text mb-4">
          أهلاً بك في المصحف الشامل
        </h2>
        <p className="text-[var(--muted)] max-w-xl mx-auto leading-8">
          اقرأ القرآن الكريم بخط عثماني، واستمع لجميع القرّاء المشهورين، وتأمل التفسير،
          وابحث في آيات الله بضغطة واحدة.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button className="btn text-base !px-7 !py-3" onClick={() => onGoto("surahs")}>
            📖 ابدأ القراءة
          </button>
          <button className="btn-ghost text-base !px-7 !py-3" onClick={() => onGoto("search")}>
            🔍 ابحث في القرآن
          </button>
        </div>
      </div>

      {/* متابعة القراءة */}
      {lastRead && (
        <div className="card card-hover flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">📍 آخر قراءة</p>
            <p className="font-headings text-xl font-bold text-[var(--gold)]">
              سورة {lastRead.surahName} — آية {lastRead.ayahNumber}
            </p>
          </div>
          <button className="btn" onClick={() => onContinue(lastRead)}>
            متابعة القراءة ←
          </button>
        </div>
      )}

      {/* متتبّع ختمة القرآن */}
      <KhatmaCard
        completed={khatmaCompleted}
        lastCompleted={
          khatmaCompleted.length
            ? surahData.find((s) => s.number === khatmaCompleted[khatmaCompleted.length - 1]) || null
            : null
        }
        onReset={onResetKhatma}
      />

      {/* مواقيت الصلاة */}
      <PrayerTimesCard />

      {/* آية اليوم */}
      <div className="card !p-6 md:!p-8 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="section-title !text-xl">🌟 آية اليوم</h3>
          {odayVerse && (
            <span className="text-xs text-[var(--muted)]">
              سورة {odayVerse.surahName} ({odayVerse.type}) — آية {odayVerse.ayahNumber}
            </span>
          )}
        </div>

        {odayLoading ? (
          <div className="flex justify-center py-8">
            <div className="loader-ring" />
          </div>
        ) : odayVerse ? (
          <>
            <p className="ayah-text text-center leading-loose">
              ﴿ {odayVerse.text} ﴾
            </p>
            {showTafsir && odayVerse.tafsir && (
              <div className="mt-5 rounded-xl p-4 fade-in" style={{ background: "var(--gold-soft)" }}>
                <p className="text-xs text-[var(--gold)] mb-2 font-bold">التفسير الميسّر:</p>
                <p className="tafsir-body !text-base !leading-8">{odayVerse.tafsir}</p>
              </div>
            )}
            <div className="flex justify-center gap-3 mt-5 flex-wrap">
              <button
                className="btn-ghost text-sm"
                onClick={() => setShowTafsir((v) => !v)}
              >
                {showTafsir ? "إخفاء التفسير" : "🧠 عرض التفسير"}
              </button>
              <button
                className="btn text-sm"
                onClick={() => onOpenSurah(odayVerse.surahNumber)}
              >
                قراءة السورة كاملة ←
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-[var(--muted)] py-8">
            تعذر تحميل آية اليوم
          </p>
        )}
      </div>

      {/* اختيار سريع */}
      <div className="card !p-6">
        <h3 className="section-title !text-xl mb-4">⚡ فتح سريع</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {quickPick.map((s) => (
            <button
              key={s.n}
              onClick={() => onOpenSurah(s.n)}
              className="card card-hover text-center !py-4 cursor-pointer"
            >
              <span className="block font-headings text-lg font-bold text-[var(--gold)]">
                {s.name}
              </span>
              <span className="text-[10px] text-[var(--muted)]">سورة {s.n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
