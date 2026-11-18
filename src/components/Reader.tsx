"use client";

import { useEffect, useRef, useState, useMemo, type CSSProperties, type MouseEvent } from "react";
import type {
  AppSettings,
  Ayah,
  BookmarkAyah,
  FavoriteSurah,
  LastRead,
  SectionId,
  SurahMeta,
} from "@/lib/types";
import { toEasternNumbers, formatTime } from "@/lib/utils";
import { fetchTranslation, fetchTajweedVerses, fetchSurahTimings } from "@/lib/api";
import { getReciter } from "@/lib/reciters";
import { downloadSurahPackage, getOfflineAudio } from "@/lib/audioStore";
import { shareAyahImage, type AyahBg } from "@/lib/ayahImage";
import { fetchTafsir } from "@/lib/api";
import MushafPages from "@/components/MushafPages";
import MemorizeQuizModal from "@/components/MemorizeQuizModal";
import VoiceReciteModal from "@/components/VoiceReciteModal";
import NotebookModal from "@/components/NotebookModal";
import WordOrderGame from "@/components/WordOrderGame";
import CompareVersesModal from "@/components/CompareVersesModal";
import WordDictionaryModal from "@/components/WordDictionaryModal";

interface ReaderProps {
  surah: SurahMeta | null;
  ayahs: Ayah[];
  loading: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  settings: AppSettings;
  scrollToAyah: number | null;
  favorites: FavoriteSurah[];
  bookmarks: BookmarkAyah[];
  onSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  onToggleFavorite: (s: SurahMeta) => void;
  onToggleAyahBookmark: (s: SurahMeta, ayahNumber: number, text: string) => void;
  isAyahBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  onOpenTafsir: (surah: number, ayah: number) => void;
  onPlayFrom: (ayahIndex: number) => void;
  onSaveLastRead: (lr: LastRead) => void;
  onShare: (s: SurahMeta, ayahNumber: number, text: string) => void;
  onToast: (msg: string) => void;
  onGoto: (s: SectionId) => void;
  isCompleted: (n: number) => boolean;
  onToggleCompleted: (n: number) => void;
  onSurahNav: (dir: -1 | 1) => void;
  onOpenSurahTo: (surah: number, ayah?: number) => void; // فتح آية محددة (من دفتري)
  onRecordVerse: () => void; // تسجيل آية مقروءة في إحصاءات اليوم
}

export default function Reader({
  surah,
  ayahs,
  loading,
  playing,
  currentTime,
  duration,
  settings,
  scrollToAyah,
  favorites,
  bookmarks,
  onSettings,
  onToggleFavorite,
  onToggleAyahBookmark,
  isAyahBookmarked,
  onOpenTafsir,
  onPlayFrom,
  onSaveLastRead,
  onShare,
  onToast,
  onGoto,
  isCompleted,
  onToggleCompleted,
  onSurahNav,
  onOpenSurahTo,
  onRecordVerse,
}: ReaderProps) {
  const [menu, setMenu] = useState<{
    ayahIndex: number;
    x: number;
    y: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollDoneRef = useRef(false);
  const lastSavedRef = useRef<number>(0);
  // وضع الحفظ: نسبة افصاح كل آية (0 مخفي → 33% → 66% → مكشوفة كاملة)
  const [reveal, setReveal] = useState<Record<number, number>>({});

  // == الترجمة الإنجليزية تحت الآية ==
  const [translations, setTranslations] = useState<Record<number, string> | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!settings.showTranslation || !surah) {
      setTranslations(null);
      setTransLoading(false);
      return;
    }
    setTransLoading(true);
    fetchTranslation(surah.number)
      .then((t) => {
        if (alive) {
          setTranslations(t);
          setTransLoading(false);
        }
      })
      .catch(() => {
        if (alive) setTransLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [surah, settings.showTranslation]);

  // == تلوين التجويد (نص عثماني ملوّن أحكامه) ==
  const [tajweed, setTajweed] = useState<Record<number, string> | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [reciteOpen, setReciteOpen] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [dictOpen, setDictOpen] = useState(false);
  const [dictWord, setDictWord] = useState("");
  const [saving, setSaving] = useState(false);
  const [isSurahOffline, setIsSurahOffline] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!settings.showTajweed || !surah) {
      setTajweed(null);
      return;
    }
    fetchTajweedVerses(surah.number)
      .then((t) => {
        if (alive) setTajweed(t);
      })
      .catch(() => {
        if (alive) setTajweed(null);
      });
    return () => {
      alive = false;
    };
  }, [surah, settings.showTajweed]);

  // هل التلاوة محفوظة محلياً؟ (شارة بدون نت في رأس القارئ)
  useEffect(() => {
    let alive = true;
    if (!surah) return;
    getOfflineAudio(settings.reciter, surah.number).then((b) => {
      if (alive) setIsSurahOffline(!!b);
    });
    return () => {
      alive = false;
    };
  }, [surah, settings.reciter, saving]);

  // == الإبراز كلمة-كلمة مع التلاوة ==
  // توقيتات الكلمات من تسجيل مرجعي، محجّمة على المدة الفعلية
  const [timings, setTimings] = useState<{
    ayahDurationsMs: number[];
    wordStarts: number[][][];
  } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!surah) return;
    fetchSurahTimings(surah.number)
      .then((t) => {
        if (alive && t) setTimings({ ayahDurationsMs: t.ayahDurationsMs, wordStarts: t.wordStarts });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [surah]);

  // حفظ السورة كاملة (نص + تلاوة + تفسير الميسّر + ترجمة) — بزر واحد
  const saveSurahPackage = async () => {
    if (!surah || saving) return;
    setSaving(true);
    const reciterInfo = getReciter(settings.reciter);
    onToast(`💾 جاري حفظ سورة ${surah.name} كاملة على جهازك...`);
    try {
      await downloadSurahPackage(
        settings.reciter,
        reciterInfo.server,
        surah.number,
        {
          fetchText: () => import("@/lib/api").then((m) => m.fetchSurahVerses(surah.number)),
          fetchTafsir: () => import("@/lib/api").then((m) => m.fetchSurahMuyassar(surah.number)),
          fetchTranslation: () => fetchTranslation(surah.number),
        }
      );
      onToast(`✅ حُفظت سورة ${surah.name} كاملة — تعمل الآن بدون إنترنت`);
    } catch {
      onToast("⚠ تعذر الحفظ الكامل — تحقق من اتصالك وحاول مجدداً");
    } finally {
      setSaving(false);
    }
  };

  // == تحديث 2.2: شريط تقدم القراءة + زر العودة للأعلى + تنقّل بلوحة المفاتيح ==
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, Math.round((h.scrollTop / max) * 100)) : 0);
      setShowTop(h.scrollTop > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ayahs.length, surah]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      // RTL: اليسار يعني التقدم في القراءة (السورة التالية)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSurahNav(1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSurahNav(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSurahNav]);

  if (!surah) {
    return (
      <div className="card text-center py-24 fade-in">
        <p className="text-5xl mb-4">📖</p>
        <p className="text-xl font-headings text-[var(--gold)] mb-2">المصحف</p>
        <p className="text-[var(--muted)]">
          اختر سورة من{" "}
          <button
            className="underline text-[var(--gold)] cursor-pointer"
            onClick={() => onGoto("surahs")}
          >
            قائمة السور
          </button>{" "}
          لبدء القراءة والاستماع
        </p>
      </div>
    );
  }

  const isFav = favorites.some((f) => f.number === surah.number);

  // الآية النشطة أثناء التلاوة — توقيتات حقيقية عند توفرها، وإلا تقدير نسبي
  const ayahStartsMemo = useMemo(() => {
    if (!surah || ayahs.length === 0) return [];
    if (playing && duration > 0 && timings && timings.ayahDurationsMs.length === ayahs.length) {
      const totalRel = timings.ayahDurationsMs.reduce((a, b) => a + b, 0);
      if (totalRel) {
        const scale = (duration * 1000) / totalRel;
        let t = 0;
        return timings.ayahDurationsMs.map((d) => {
          const s = t;
          t += d * scale;
          return s / 1000;
        });
      }
    }
    // تقدير نسبي (احتياطي)
    if (!playing || duration <= 0) return [];
    return ayahs.map((_, i) => (duration * i) / ayahs.length);
  }, [surah, ayahs, playing, duration, timings]);

  const activeIndex =
    playing && duration > 0 && ayahStartsMemo.length
      ? Math.max(
          0,
          Math.min(
            ayahStartsMemo.reduce((acc, s, i) => (currentTime >= s - 0.15 ? i : acc), 0),
            ayahs.length - 1
          )
        )
      : -1;

  // فهرس الكلمة النشطة داخل الآية النشطة (الإبراز كلمة-كلمة)
  const activeWord = useMemo(() => {
    if (activeIndex < 0 || !timings || !ayahStartsMemo.length) return -1;
    const starts = timings.wordStarts[activeIndex];
    if (!starts?.length) return -1;
    const scale =
      timings.ayahDurationsMs.reduce((a, b) => a + b, 0) > 0
        ? (duration * 1000) /
          timings.ayahDurationsMs.reduce((a, b) => a + b, 0)
        : 1;
    const intoAyah = currentTime - ayahStartsMemo[activeIndex];
    const ms = intoAyah * 1000;
    let idx = -1;
    for (let i = 0; i < starts.length; i++) {
      const st = starts[i]?.[0];
      if (st !== undefined && st <= ms) idx = i;
      else if (st !== undefined && st > ms) break;
    }
    return idx;
  }, [activeIndex, timings, ayahStartsMemo, currentTime, duration]);

  // انزلاق إلى آية محددة عند الفتح
  useEffect(() => {
    if (scrollToAyah && ayahs.length) {
      const el = document.getElementById(`ayah-${scrollToAyah}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("active");
        setTimeout(() => el.classList.remove("active"), 6000);
      }
    }
  }, [scrollToAyah, ayahs.length]);

  // == وضع الحفظ (تسميع) ==
  // كل نقرة تُزيد نسبة الكشف: 0 → 1/3 → 2/3 → كاملة → ترجع مخفية
  const revealStep = 1 / 3;
  const cycleReveal = (i: number) => {
    setReveal((prev) => {
      const cur = prev[i] ?? 0;
      const next = cur >= 1 ? 0 : Math.min(1, cur + revealStep);
      if (next >= 1) onToast("أتممت إفصاح الآية ✓ راجعها ثم اضغطها مرة أخرى للتسميع");
      return { ...prev, [i]: next };
    });
  };
  const tokenStyle = (i: number): CSSProperties | undefined => {
    if (!settings.memorize) return undefined;
    const f = reveal[i] ?? 0;
    const pct = Math.round(f * 100);
    const style: CSSProperties = {};
    if (f < 1) style.filter = `blur(${(9 * (1 - f)).toFixed(1)}px)`;
    if (f > 0 && f < 1) {
      style.WebkitMaskImage = `linear-gradient(270deg, black ${pct}%, transparent ${pct}%)`;
      style.maskImage = `linear-gradient(270deg, black ${pct}%, transparent ${pct}%)`;
    }
    return style;
  };
  const handleTokenClick = (e: MouseEvent<HTMLElement>, i: number) => {
    e.stopPropagation();
    if (settings.memorize) {
      cycleReveal(i);
      return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({ ayahIndex: i, x: r.left + r.width / 2, y: r.bottom + 8 });
  };

  // نقر مزدوج على كلمة → قاموس جذرها ومعناها
  const handleAyahDblClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const sel = window.getSelection()?.toString().trim() || "";
    const first = sel.split(/\s+/)[0] || "";
    if (/[\u0600-\u06FF]/.test(first)) {
      setDictWord(first);
      setDictOpen(true);
    }
  };

  // إغلاق قائمة السياق عند النقر خارجها
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menu]);

  // حفظ آخر قراءة تلقائياً أثناء التمرير
  useEffect(() => {
    if (!ayahs.length) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const vision = document.querySelectorAll<HTMLElement>(".ayah-block");
        if (!vision.length) return;
        const mid = window.innerHeight / 2;
        for (const el of vision) {
          const r = el.getBoundingClientRect();
          if (r.top <= mid && r.bottom >= mid) {
            const n = Number(el.dataset.ayah);
            if (n && (!scrollDoneRef.current || n !== lastSavedRef.current)) {
              lastSavedRef.current = n;
              onRecordVerse();
              onSaveLastRead({
                surahNumber: surah.number,
                surahName: surah.name,
                ayahNumber: n,
              });
            }
            break;
          }
        }
      }, 1200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [ayahs.length, surah, onSaveLastRead, onRecordVerse]);

  // إحصاءات: تسجيل أول آية تُقرأ عند فتح سورة + تصفير نسبة الإفصاح عند تغيير السورة
  useEffect(() => {
    lastSavedRef.current = 0;
    setReveal({});
    if (ayahs.length) onRecordVerse();
  }, [ayahs.length, surah, onRecordVerse]);

  const bismillah = surah.number !== 9 && surah.number !== 1;
  const continuous = settings.displayMode === "continuous";
  const mushafMode = settings.displayMode === "mushaf";

  // محتوى نص الآية — بالتجويد الملوّن إن فعّل المستخدم ذلك
  // عند التلاوة النشطة: إبراز كلمة-كلمة (يُعطّل تلقائياً مع التجويد لسلامة الوسوم)
  const ayahContent = (ayah: Ayah, ayahIndex: number = -1) => {
    const n = Number(ayah.verse_key.split(":")[1]);
    const seal = <span className="ayah-seal">{toEasternNumbers(n)}</span>;

    // إبراز الكلمة النشطة
    if (ayahIndex === activeIndex && activeWord >= 0 && !settings.showTajweed) {
      const words = ayah.text_uthmani.replace(/[\u06DD\u066D\u0660-\u0669]/g, "").trim().split(/\s+/);
      return (
        <>
          {words.map((w, wi) => (
            <span key={wi} className={wi === activeWord ? "word-active" : undefined}>
              {w}{" "}
            </span>
          ))}
          {seal}
        </>
      );
    }

    if (settings.showTajweed && tajweed?.[n]) {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: tajweed[n] + ` <span class="ayah-seal">${toEasternNumbers(n)}</span>`,
          }}
        />
      );
    }
    return <>{ayah.text_uthmani}{seal}</>;
  };

  const currentMenuAyah = menu ? ayahs[menu.ayahIndex] : null;
  const menuAyahNumber = currentMenuAyah
    ? Number(currentMenuAyah.verse_key.split(":")[1])
    : 0;

  return (
    <div className="fade-in" ref={containerRef}>
      {/* رأس القارئ */}
      <div className="card !rounded-3xl mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-headings text-2xl md:text-3xl font-bold text-[var(--gold)]">
            سورة {surah.name}
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            {surah.type} · {toEasternNumbers(surah.verses)} آية ·{" "}
            {surah.englishName}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* حجم الخط */}
          <div className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2">
            <button
              className="text-[var(--muted)] hover:text-[var(--gold)] px-1 cursor-pointer"
              onClick={() =>
                onSettings((p) => ({ ...p, fontSize: Math.max(20, p.fontSize - 2) }))
              }
              title="تصغير الخط"
            >
              <span className="text-xs">أ−</span>
            </button>
            <span className="text-[10px] text-[var(--muted)]">{settings.fontSize}</span>
            <button
              className="text-[var(--muted)] hover:text-[var(--gold)] px-1 cursor-pointer"
              onClick={() =>
                onSettings((p) => ({ ...p, fontSize: Math.min(48, p.fontSize + 2) }))
              }
              title="تكبير الخط"
            >
              <span className="text-base">أ+</span>
            </button>
          </div>

          {/* نمط العرض: متصل / آية بسطر / صفحات المصحف */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            onClick={() => {
              const order = ["continuous", "byline", "mushaf"] as const;
              const next = order[(order.indexOf(settings.displayMode) + 1) % order.length];
              onSettings((p) => ({ ...p, displayMode: next }));
              if (next === "mushaf") onToast("📕 وضع صفحات المصحف — 604 صفحات كالمصحف المطبوع");
            }}
          >
            {settings.displayMode === "continuous"
              ? "📜 عرض: مصحف متصل"
              : settings.displayMode === "byline"
              ? "📄 عرض: آية بسطر"
              : "📕 عرض: صفحات المصحف"}
          </button>

          {/* تلوين التجويد */}
          <button
            className={`!py-1.5 text-xs ${settings.showTajweed ? "btn" : "btn-ghost"}`}
            title="تلوين أحكام التجويد: المد أزرق، الغنّة أخضر، القلقلة أحمر..."
            onClick={() => {
              onSettings((p) => ({ ...p, showTajweed: !p.showTajweed }));
              onToast(!settings.showTajweed ? "🎨 تلوين التجويد مُفعَّل" : "أُوقف تلوين التجويد");
            }}
          >
            {settings.showTajweed ? "🎨 التجويد: مفعّل" : "🎨 تلوين التجويد"}
          </button>

          {/* اختبار الحفظ */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            title="اختبر حفظك: تظهر أول كلمة من الآية وأنت تكملها"
            onClick={() => setQuizOpen(true)}
          >
            🎯 اختبار الحفظ
          </button>

          {/* التسميع الصوتي — تفريغ محلي بنموذج مفتوح المصدر */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            title="اسمِع حفظك بالمايك — يقيّم تلاوتك كلمة كلمة على جهازك بلا سيرفر"
            onClick={() => setReciteOpen(true)}
          >
            🎤 تسميع صوتي
          </button>

          {/* لعبة تركيب الكلمات */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            title="لعبة: اضغط كلمتين لتبديلهما حتى تستقيم الآية"
            onClick={() => setGameOpen(true)}
          >
            🧩 لعبة
          </button>

          {/* دفتري: ملاحظاتي + سجل التفاسير + مراجعة اليوم + درجات */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            title="دفترك الدراسي: ملاحظات، سجل التفسيرات، كلماتك الخاطئة، مراجعة اليوم، درجات الحفظ"
            onClick={() => setNotebookOpen(true)}
          >
            📓 دفتري
          </button>

          {/* مقارنة روايتين جنباً إلى جنب */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            title="قارن نسختين من نص القرآن كلمة-كلمة مع إبراز الاختلافات"
            onClick={() => setCompareOpen(true)}
          >
            ⚖️ مقارنة
          </button>

          {/* قاموس الجذور */}
          <button
            className="btn-ghost !py-1.5 text-xs"
            title="جذر الكلمة ومعناها — أو اضغط نقرة مزدوجة على أي كلمة في النص"
            onClick={() => {
              setDictWord("");
              setDictOpen(true);
            }}
          >
            📖 جذور
          </button>

          {/* حفظ السورة كاملة بدون نت (نص + تلاوة + تفسير + ترجمة) */}
          <button
            className={`!py-1.5 text-xs ${isSurahOffline ? "btn" : "btn-ghost"}`}
            title="حفظ السورة كاملة على جهازك: النص + التلاوة + التفسير الميسّر + الترجمة — تعمل بعدها بدون إنترنت"
            onClick={saveSurahPackage}
            disabled={saving}
          >
            {saving
              ? "⏳ جاري الحفظ..."
              : isSurahOffline
              ? "📴 محفوظة بدون نت"
              : "💾 حفظ بدون نت"}
          </button>

          {/* وضع الحفظ (تسميع): إخفاء النص تدريجياً */}
          <button
            className={`!py-1.5 text-xs ${settings.memorize ? "btn" : "btn-ghost"}`}
            title="اسمِع حفظك: اضغط على الآية لكشفها تدريجياً"
            onClick={() => {
              onSettings((p) => ({ ...p, memorize: !p.memorize }));
              if (!settings.memorize) {
                setReveal({});
                onToast("وضع الحفظ مُفعَّل 🧠 — اضغط الآية لكشف جزء منها");
              }
            }}
          >
            {settings.memorize ? "🧠 حفظ: يعمل" : "🧠 وضع الحفظ"}
          </button>

          {/* ترجمة إنجليزية تحت الآية */}
          <button
            className={`!py-1.5 text-xs ${settings.showTranslation ? "btn" : "btn-ghost"}`}
            title="ترجمة إنجليزية تحت الآية"
            onClick={() => {
              onSettings((p) => ({ ...p, showTranslation: !p.showTranslation }));
              onToast(!settings.showTranslation ? "🌐 الترجمة الإنجليزية مُفعَّلة" : "أُوقفت الترجمة الإنجليزية");
            }}
          >
            {settings.showTranslation ? "🌐 الترجمة: مفعّلة" : "🌐 الترجمة الإنجليزية"}
          </button>

          <button className="btn-ghost !py-1.5 text-xs" onClick={() => onToggleFavorite(surah)}>
            {isFav ? "❤️ في المفضلة" : "🤍 إضافة للمفضلة"}
          </button>

          <button
            className={`!py-1.5 text-xs ${isCompleted(surah.number) ? "btn" : "btn-ghost"}`}
            onClick={() => onToggleCompleted(surah.number)}
            title="عند الأتمام عدّها في متتبّع الختمة"
          >
            {isCompleted(surah.number) ? "✅ أتممت السورة" : "☑ أتممت السورة"}
          </button>

          {/* تنقّل سريع بين السور */}
          <div className="flex rounded-full border border-[var(--border)] overflow-hidden">
            <button
              className="px-3 py-1.5 text-xs hover:bg-[var(--gold-soft)] hover:text-[var(--gold)] transition-all"
              title="السورة السابقة"
              onClick={() => onSurahNav(-1)}
            >
              ⏭
            </button>
            <button
              className="px-3 py-1.5 text-sm border-x border-[var(--border)] text-[var(--gold)]"
              title={surah.englishName}
            >
              {surah.number} / 114
            </button>
            <button
              className="px-3 py-1.5 text-xs hover:bg-[var(--gold-soft)] hover:text-[var(--gold)] transition-all"
              title="السورة التالية"
              onClick={() => onSurahNav(1)}
            >
              ⏮
            </button>
          </div>

          <button
            className="btn-ghost !py-1.5 text-xs"
            onClick={async () => {
              const text = ayahs.map((a) => a.text_uthmani).join(" ");
              const full = `سورة ${surah.name}\n\n${text}`;
              try {
                await navigator.clipboard.writeText(full);
                onToast("تم نسخ السورة كاملة ✓");
              } catch {
                onToast("تعذر النسخ");
              }
            }}
          >
            📋 نسخ السورة
          </button>
        </div>
      </div>

      {/* المحتوى */}
      {mushafMode && !loading && ayahs.length > 0 ? (
        <MushafPages surahNumber={surah.number} onToast={onToast} />
      ) : (
        <div className="card !rounded-3xl !p-6 md:!p-10">
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <div className="loader-ring" />
              <p className="text-[var(--gold)]">جاري تحميل الآيات...</p>
            </div>
          ) : ayahs.length === 0 ? (
            <p className="text-center text-[var(--danger)] py-20">
              تعذر تحميل الآيات، حاول مرة أخرى
            </p>
          ) : (
            <>
              {bismillah && (
                <p className="text-center font-quran text-2xl md:text-3xl text-[var(--gold)] mb-8">
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              )}

              {continuous ? (
                /* عرض المصحف المتصل */
                <p className="ayah-text text-justify" dir="rtl" lang="ar">
                  {ayahs.map((ayah, i) => {
                    const n = Number(ayah.verse_key.split(":")[1]);
                    return (
                      <span
                        key={ayah.verse_key}
                        id={`ayah-${n}`}
                        data-ayah={n}
                        className={`ayah-block inline ${
                          activeIndex === i ? "active" : ""
                        }`}
                      >
                        <span
                          className="ayah-token cursor-pointer rounded-lg px-1"
                          onClick={(e) => handleTokenClick(e, i)}
                          onDoubleClick={handleAyahDblClick}
                          style={
                            activeIndex === i
                              ? { background: "var(--gold-soft)", color: "var(--gold)", ...tokenStyle(i) }
                              : tokenStyle(i)
                          }
                        >
                          {ayahContent(ayah, i)}
                        </span>{" "}
                      </span>
                    );
                  })}
                </p>
              ) : (
                /* آية في سطر */
                <div className="space-y-4">
                  {ayahs.map((ayah, i) => {
                    const n = Number(ayah.verse_key.split(":")[1]);
                    const marked = isAyahBookmarked(surah.number, n);
                    return (
                      <div
                        key={ayah.verse_key}
                        id={`ayah-${n}`}
                        data-ayah={n}
                        className={`ayah-block rounded-2xl p-4 transition-all ${
                          activeIndex === i ? "active-ayah" : ""
                        }`}
                        style={
                          activeIndex === i
                            ? { background: "var(--gold-soft)", border: "1px solid var(--gold)" }
                            : { border: "1px solid transparent" }
                        }
                      >
                        <p className="ayah-text">
                          <span
                            className="ayah-token"
                            onClick={(e) => handleTokenClick(e, i)}
                            onDoubleClick={handleAyahDblClick}
                            style={tokenStyle(i)}
                          >
                            {ayahContent(ayah, i)}
                          </span>
                        </p>
                      {/* الترجمة الإنجليزية تحت الآية */}
                      {settings.showTranslation &&
                        (translations?.[n] ? (
                          <p
                            dir="ltr"
                            lang="en"
                            className="text-[13px] leading-6 text-[var(--muted)] mt-2 italic"
                          >
                            {translations[n]}
                          </p>
                        ) : transLoading ? (
                          <p className="text-[11px] text-[var(--muted)] mt-2">🌐 جاري تحميل الترجمة...</p>
                        ) : null)}
                      <div className="flex gap-2 mt-3 flex-wrap opacity-80">
                        <button
                          className="btn-ghost !px-3 !py-1 !text-xs"
                          onClick={() => onOpenTafsir(surah.number, n)}
                        >
                          🧠 التفسير
                        </button>
                        <button
                          className="btn-ghost !px-3 !py-1 !text-xs"
                          onClick={() => onPlayFrom(i)}
                        >
                          ▶ تلاوة من هنا
                        </button>
                        <button
                          className="btn-ghost !px-3 !py-1 !text-xs"
                          onClick={() =>
                            onToggleAyahBookmark(surah, n, ayah.text_uthmani)
                          }
                        >
                          {marked ? "★ محفوظة" : "🔖 حفظ الآية"}
                        </button>
                        <button
                          className="btn-ghost !px-3 !py-1 !text-xs"
                          onClick={() => onShare(surah, n, ayah.text_uthmani)}
                        >
                          📤 مشاركة
                        </button>
                        <button
                          className="btn-ghost !px-3 !py-1 !text-xs"
                          onClick={async () => {
                            const r = await shareAyahImage({
                              surahName: surah.name,
                              ayahNumber: n,
                              text: ayah.text_uthmani,
                            });
                            onToast(
                              r === "shared"
                                ? "🖼 شُاركت صورة الآية ✓"
                                : r === "downloaded"
                                ? "🖼 نُزّلت صورة الآية — شاركها من صورك"
                                : "تعذر توليد الصورة"
                            );
                          }}
                          title="توليد صورة جميلة بالآية ومشاركتها مباشرة"
                        >
                          🖼 صورة
                        </button>
                        <button
                          className="btn-ghost !px-3 !py-1 !text-xs"
                          onClick={async () => {
                            onToast("🖼 جاري تجهيز الصورة مع التفسير...");
                            try {
                              const t = await fetchTafsir(surah.number, n, "ar.muyassar");
                              const r = await shareAyahImage(
                                { surahName: surah.name, ayahNumber: n, text: ayah.text_uthmani },
                                { bg: "dawn" as AyahBg, tafsir: t.text }
                              );
                              onToast(
                                r === "shared"
                                  ? "🖼 شُاركت الصورة مع التفسير ✓"
                                  : r === "downloaded"
                                  ? "🖼 نُزّلت الصورة مع التفسير — شاركها من صورك"
                                  : "تعذر توليد الصورة"
                              );
                            } catch {
                              onToast("تعذر جلب التفسير — تحقق من اتصالك وحاول مجدداً");
                            }
                          }}
                          title="صورة الآية مع التفسير الميسّر أسفلها"
                        >
                          🖼 صورة + تفسير
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        </div>
      )}

      {/* نافذة اختبار الحفظ */}
      {quizOpen && (
        <MemorizeQuizModal surah={surah} ayahs={ayahs} onClose={() => setQuizOpen(false)} />
      )}

      {/* نافذة التسميع الصوتي */}
      {reciteOpen && (
        <VoiceReciteModal surah={surah} ayahs={ayahs} onClose={() => setReciteOpen(false)} />
      )}

      {/* لعبة تركيب الكلمات */}
      {gameOpen && (
        <WordOrderGame
          surah={surah}
          ayahs={ayahs}
          onClose={() => setGameOpen(false)}
          onToast={onToast}
        />
      )}

      {/* دفتري */}
      {notebookOpen && (
        <NotebookModal
          onClose={() => setNotebookOpen(false)}
          onOpenSurah={(s, a) => onOpenSurahTo(s, a)}
          onToast={onToast}
        />
      )}

      {/* مقارنة روايتين جنباً إلى جنب */}
      {compareOpen && surah && (
        <CompareVersesModal
          initialSurah={surah.number}
          onClose={() => setCompareOpen(false)}
          onOpenSurah={(s, a) => onOpenSurahTo(s, a)}
        />
      )}

      {/* قاموس جذور الكلمات */}
      {dictOpen && (
        <WordDictionaryModal initialWord={dictWord} onClose={() => setDictOpen(false)} />
      )}

      {/* تنبيه الترجمة في عرض المصحف المتصل */}
      {continuous && !loading && ayahs.length > 0 && settings.showTranslation && (
        <p className="text-center text-[11px] text-[var(--muted)] mt-4">
          🌐 الترجمة الإنجليزية تظهر تحت كل آية في عرض «آية بسطر» — بدّل العرض من الأعلى لرؤيتها
        </p>
      )}

      {/* قائمة سياق الآية */}
      {menu && currentMenuAyah && (
        <div
          className="ayah-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            right: "auto",
            left: `${Math.max(menu.x - 105, 8)}px`,
            top: `${Math.min(menu.y + 60, window.innerHeight - 260)}px`,
            transform: "translateY(0)",
          }}
        >
          <button
            onClick={() => {
              onPlayFrom(menu.ayahIndex);
              setMenu(null);
              onToast("بدأت التلاوة من هذه الآية ▶");
            }}
          >
            ▶ تلاوة من هنا
          </button>
          <button
            onClick={() => {
              onOpenTafsir(surah.number, menuAyahNumber);
              setMenu(null);
            }}
          >
            🧠 التفسير
          </button>
          <button
            onClick={() => {
              onToggleAyahBookmark(surah, menuAyahNumber, currentMenuAyah.text_uthmani);
              setMenu(null);
            }}
          >
            {isAyahBookmarked(surah.number, menuAyahNumber) ? "★ إزالة الحفظ" : "🔖 حفظ الآية"}
          </button>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `﴿ ${currentMenuAyah.text_uthmani} ﴾\n— سورة ${surah.name}، الآية ${menuAyahNumber}`
                );
                onToast("تم نسخ الآية ✓");
              } catch {
                onToast("تعذر النسخ");
              }
              setMenu(null);
            }}
          >
            📋 نسخ
          </button>
          <button
            onClick={() => {
              onShare(surah, menuAyahNumber, currentMenuAyah.text_uthmani);
              setMenu(null);
            }}
          >
            📤 مشاركة
          </button>
          <button
            onClick={async () => {
              const r = await shareAyahImage({
                surahName: surah.name,
                ayahNumber: menuAyahNumber,
                text: currentMenuAyah.text_uthmani,
              });
              onToast(
                r === "shared"
                  ? "🖼 شُاركت صورة الآية ✓"
                  : r === "downloaded"
                  ? "🖼 نُزّلت صورة الآية — شاركها من صورك"
                  : "تعذر توليد الصورة"
              );
              setMenu(null);
            }}
          >
            🖼 مشاركة كصورة
          </button>
        </div>
      )}

      {/* معلومة التمرير */}
      {!loading && ayahs.length > 0 && (
        <p className="text-center text-[11px] text-[var(--muted)] opacity-60 mt-4">
          {settings.memorize
            ? "🧠 وضع الحفظ: اضغط على الآية لكشف جزء منها (ثلاث نقرات للمكاشفة الكاملة) — الإحصاءات تسجّل قراءتك تلقائياً"
            : "اضغط على أي آية لعرض قائمة (تلاوة، تفسير، حفظ، مشاركة) · يتم حفظ آخر قراءة تلقائياً أثناء التمرير"}
        </p>
      )}

      {/* شريط تقدم القراءة */}
      <div
        style={{
          position: "fixed",
          top: 0,
          insetInline: 0,
          height: 3,
          zIndex: 960,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "var(--gold)",
            transition: "width 0.15s ease-out",
            opacity: progress > 0 ? 1 : 0,
          }}
        />
      </div>

      {/* زر العودة للأعلى */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="العودة إلى أعلى المصحف"
          style={{
            position: "fixed",
            bottom: "calc(88px + env(safe-area-inset-bottom))",
            insetInlineEnd: 18,
            zIndex: 950,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--bg)",
            border: "1px solid var(--gold)",
            color: "var(--gold)",
            fontSize: 18,
            boxShadow: "0 4px 14px rgba(0,0,0,.35)",
            cursor: "pointer",
          }}
          className="fade-in"
        >
          ⬆
        </button>
      )}
    </div>
  );
}
