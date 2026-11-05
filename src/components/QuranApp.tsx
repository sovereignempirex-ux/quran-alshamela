"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AppSettings,
  Ayah,
  BookmarkAyah,
  FavoriteSurah,
  LastRead,
  SectionId,
  SurahMeta,
} from "@/lib/types";
import { surahData } from "@/lib/surahData";
import { fetchSurahVerses } from "@/lib/api";
import { defaultReciter } from "@/lib/reciters";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { autoThemeEffective } from "@/lib/utils";
import { addCompletedSurah, addVerses, emptyStats, type StatsData } from "@/lib/stats";
import Splash from "@/components/Splash";
import Header from "@/components/Header";
import HomeSection from "@/components/HomeSection";
import SurahGrid from "@/components/SurahGrid";
import Reader from "@/components/Reader";
import AudioBar from "@/components/AudioBar";
import SearchSection from "@/components/SearchSection";
import FavoritesSection from "@/components/FavoritesSection";
import TafsirModal from "@/components/TafsirModal";
import DownloadsSection from "@/components/DownloadsSection";
import KofiWidget from "@/components/KofiWidget";
import AppUpdater from "@/components/AppUpdater";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  fontSize: 30,
  reciter: defaultReciter,
  displayMode: "continuous",
  autoNext: true,
  speed: 1,
  volume: 1,
  dailyGoal: 10,
  memorize: false,
  repeatAyah: false,
  showTranslation: false,
};

export default function QuranApp() {
  // بيانات محفوظة محلياً
  const settingsLS = useLocalStorage<AppSettings>("quranAppSettings", DEFAULT_SETTINGS);
  const favoritesLS = useLocalStorage<FavoriteSurah[]>("quranFavorites", []);
  const bookmarksLS = useLocalStorage<BookmarkAyah[]>("quranAyahBookmarks", []);
  const lastReadLS = useLocalStorage<LastRead | null>("quranLastRead", null);
  const khatmaLS = useLocalStorage<number[]>("quranKhatma", []);
  const statsLS = useLocalStorage<StatsData>("quranStats", emptyStats);

  // دمج الإعدادات المحفوظة مع الافتراضية (لسلامة المفتاح التناسقي القديمة)
  const settings = { ...DEFAULT_SETTINGS, ...settingsLS.value };

  // == إدارة المفضلة والعلامات ==

  const [entered, setEntered] = useState(false);
  const [section, setSection] = useState<SectionId>("home");

  const [surah, setSurah] = useState<SurahMeta | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  const [scrollToAyah, setScrollToAyah] = useState<number | null>(null);

  // التفسير
  const [tafsirTarget, setTafsirTarget] = useState<{ surah: number; ayah: number } | null>(null);
  const [openTafsir, setOpenTafsir] = useState(false);

  // حالة الصوت
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);

  // == تطبيق الثيم وحجم الخط على الصفحة (مع حساب الوضع التلقائي حسب الوقت) ==
  useEffect(() => {
    const mode = settingsLS.value.theme;
    const effective =
      mode === "auto" ? (autoThemeEffective() ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", effective);
    document.documentElement.style.setProperty("--ayat-size", `${settingsLS.value.fontSize}px`);
  }, [settingsLS.value.theme, settingsLS.value.fontSize]);

  // نبضة كل 5 دقائق لتحديث الوضع التلقائي حسب الوقت
  useEffect(() => {
    if (settingsLS.value.theme !== "auto") return;
    const id = setInterval(() => {
      document.documentElement.setAttribute(
        "data-theme",
        autoThemeEffective() ? "dark" : "light"
      );
    }, 300000);
    return () => clearInterval(id);
  }, [settingsLS.value.theme]);

  // == مراقبة حالة الاتصال (تطبيق يعمل من جهاز المستخدم) ==
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // == كشف بيئة التشغيل: نسخة الويب = يظهر قسم تنزيل EXE/APK، وداخل EXE/APK = مخفية ==
  const [isWebClient, setIsWebClient] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isElectron = params.get("env") === "desktop";
    const isCapacitor =
      typeof (window as { Capacitor?: unknown }).Capacitor !== "undefined" ||
      (/Android/i.test(navigator.userAgent) && /(;\s*wv\))/i.test(navigator.userAgent));
    setIsWebClient(!isElectron && !isCapacitor);
  }, []);

  // == فتح سورة ==
  const openSurah = useCallback(
    async (surahNumber: number, ayahNumber?: number) => {
      const meta = surahData.find((s) => s.number === surahNumber);
      if (!meta) return;

      setSurah(meta);
      setAyahs([]);
      setLoadingAyahs(true);
      setSection("reader");
      window.scrollTo({ top: 0 });

      // احفظ آخر قراءة
      lastReadLS.setValue({
        surahNumber,
        surahName: meta.name,
        ayahNumber: ayahNumber || 1,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps

      try {
        const verses = await fetchSurahVerses(surahNumber);
        setAyahs(verses);
        setLoadingAyahs(false);
        if (ayahNumber) {
          setScrollToAyah(ayahNumber);
        } else {
          setScrollToAyah(null);
        }
      } catch (e) {
        setLoadingAyahs(false);
        setAyahs([]);
        console.error(e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // == التشغيل والصوت ==
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => undefined);
    }
  }, [playing]);

  const playFrom = useCallback(
    (ayahIndex: number) => {
      const audio = audioRef.current;
      const total = surah?.verses || 1;
      if (!audio || !audio.duration || isNaN(audio.duration)) return;
      const pos = ayahIndex / Math.max(total, 1) * audio.duration;
      audio.currentTime = Math.min(pos, Math.max(audio.duration - 2, 0));
      if (!playing) audio.play().catch(() => undefined);
    },
    [playing, surah]
  );

  const isSurahFavorite = (n: number) => favoritesLS.value.some((f) => f.number === n);

  const toggleSurahFavorite = (s: SurahMeta) => {
    favoritesLS.setValue((prev) =>
      prev.some((f) => f.number === s.number)
        ? prev.filter((f) => f.number !== s.number)
        : [...prev, s]
    );
  };

  const isAyahBookmarked = (surahNumber: number, ayahNumber: number) =>
    bookmarksLS.value.some(
      (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
    );

  const toggleAyahBookmark = (surahMeta: SurahMeta, ayahNumber: number, text: string) => {
    bookmarksLS.setValue((prev) =>
      isAyahBookmarked(surahMeta.number, ayahNumber)
        ? prev.filter((b) => !(b.surahNumber === surahMeta.number && b.ayahNumber === ayahNumber))
        : [
            {
              surahNumber: surahMeta.number,
              surahName: surahMeta.name,
              ayahNumber,
              text,
            },
            ...prev,
          ]
    );
  };

  const addBookmarkFromAyah = (ayah: Ayah) => {
    if (!surah) return;
    const ayahNumber = Number(ayah.verse_key.split(":")[1]);
    toggleAyahBookmark(surah, ayahNumber, ayah.text_uthmani);
  };

  // نسخة للاستخدام من المفضلة (برقم السورة فقط)
  const toggleAyahBookmarkByNumber = (surahNumber: number, ayahNumber: number, text: string) => {
    const meta = surahData.find((s) => s.number === surahNumber);
    if (meta) toggleAyahBookmark(meta, ayahNumber, text);
  };

  // == متتبّع الختمة ==
  const isKhatmaCompleted = (n: number) => khatmaLS.value.includes(n);

  const toggleKhatmaCompleted = (n: number) => {
    khatmaLS.setValue((prev) =>
      prev.includes(n)
        ? prev.filter((m) => m !== n)
        : [...prev, n].sort((a, b) => a - b)
    );
  };

  const resetKhatma = () => khatmaLS.setValue([]);

  // == إحصاءات القراءة ==
  const recordVerse = useCallback(
    () => statsLS.setValue((prev) => addVerses(prev, 1)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const recordCompleted = useCallback(() => {
    statsLS.setValue((prev) => addCompletedSurah(prev));
  }, []);


  // نسخ آية إلى الحافظة
  const copyAyah = async (surahMeta: SurahMeta, ayahNumber: number, text: string) => {
    const full = `﴿ ${text} ﴾\n— سورة ${surahMeta.name}، الآية ${ayahNumber}`;
    try {
      await navigator.clipboard.writeText(full);
      toast("تم نسخ الآية ✓");
    } catch {
      toast("تعذر النسخ");
    }
  };

  // مشاركة آية
  const shareAyah = async (surahMeta: SurahMeta, ayahNumber: number, text: string) => {
    const full = `﴿ ${text} ﴾\n— سورة ${surahMeta.name}، الآية ${ayahNumber}\n\n📖 مصحف الشاملة الإلكتروني`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "آية من القرآن الكريم", text: full });
      } else {
        await navigator.clipboard.writeText(full);
        toast("تم نسخ الآية للمشاركة ✓");
      }
    } catch {
      /* ألغى المستخدم */
    }
  };

  // رسائل مؤقتة (toast)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  };

  // اختصارات الكيبورد
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.code === "Space" && surah) {
        e.preventDefault();
        togglePlay();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [surah, togglePlay]);

  return (
    <>
      {!entered && <Splash onEnter={() => setEntered(true)} />}

      {entered && (
        <div className="min-h-screen">
          {/* فاحص التحديث الذاتي — يعمل بأي بيئة (ويب/إلكترون/كاباسيتور) */}
          <AppUpdater onToast={toast} />

          <Header
            section={section}
            onSection={setSection}
            settings={settings}
            onSettings={settingsLS.setValue}
            lastRead={lastReadLS.value}
            onContinue={(lr) => openSurah(lr.surahNumber, lr.ayahNumber)}
            showDownloads={isWebClient}
            showDonate={isWebClient}
          />

          <main className="max-w-6xl mx-auto px-4 pt-6 pb-28">
            {section === "home" && (
              <HomeSection
                lastRead={lastReadLS.value}
                onContinue={(lr) => openSurah(lr.surahNumber, lr.ayahNumber)}
                onOpenSurah={(n) => openSurah(n)}
                onGoto={(sec) => setSection(sec)}
                khatmaCompleted={khatmaLS.value}
                onResetKhatma={resetKhatma}
                stats={statsLS.value}
                dailyGoal={settings.dailyGoal}
                onGoal={(g) => settingsLS.setValue((p) => ({ ...p, dailyGoal: g }))}
              />
            )}

            {section === "surahs" && (
              <SurahGrid
                favorites={favoritesLS.value}
                completed={khatmaLS.value}
                onOpen={(n) => openSurah(n)}
                onToggleFavorite={toggleSurahFavorite}
                isFavorite={isSurahFavorite}
              />
            )}

            {section === "reader" && (
              <Reader
                surah={surah}
                ayahs={ayahs}
                loading={loadingAyahs}
                playing={playing}
                currentTime={currentTime}
                duration={duration}
                settings={settings}
                scrollToAyah={scrollToAyah}
                favorites={favoritesLS.value}
                bookmarks={bookmarksLS.value}
                onSettings={settingsLS.setValue}
                onToggleFavorite={toggleSurahFavorite}
                onToggleAyahBookmark={(m, n, t) => {
                  toggleAyahBookmark(m, n, t);
                }}
                isAyahBookmarked={isAyahBookmarked}
                onOpenTafsir={(s, a) => {
                  setTafsirTarget({ surah: s, ayah: a });
                  setOpenTafsir(true);
                }}
                onPlayFrom={(i) => playFrom(i)}
                onSaveLastRead={(lr) => lastReadLS.setValue(lr)}
                onShare={shareAyah}
                onToast={toast}
                onGoto={(sec) => setSection(sec)}
                isCompleted={isKhatmaCompleted}
                onToggleCompleted={(n) => {
                  const had = khatmaLS.value.includes(n);
                  toggleKhatmaCompleted(n);
                  if (!had) recordCompleted();
                }}
                onSurahNav={(dir) => {
                  if (!surah) return;
                  let next = surah.number + dir;
                  if (next > 114) next = 1;
                  if (next < 1) next = 114;
                  openSurah(next);
                }}
                onRecordVerse={recordVerse}
              />
            )}

            {section === "search" && <SearchSection onOpenSurah={openSurah} />}

            {section === "favorites" && (
              <FavoritesSection
                favorites={favoritesLS.value}
                bookmarks={bookmarksLS.value}
                onOpenSurah={(n) => openSurah(n)}
                onOpenAyah={(sn, an) => openSurah(sn, an)}
                onToggleFavorite={toggleSurahFavorite}
                onToggleAyahBookmark={toggleAyahBookmarkByNumber}
                onGoto={(sec) => setSection(sec)}
              />
            )}

            {section === "downloads" && <DownloadsSection />}
          </main>

          {/* زر الدعم العائم — نسخة الويب فقط */}
          {isWebClient && <KofiWidget />}

          <footer className="border-t border-[var(--border)] py-10 text-center">
            <p className="font-headings text-xl mb-2 text-[var(--gold)]">صدق الله العظيم</p>
            <p className="text-sm text-[var(--muted)]">
              صنع بإتقان من <span className="text-[var(--gold)] font-bold">عمر</span> 🌟
            </p>
            {isWebClient && (
              <p className="mt-2">
                <a
                  href="https://ko-fi.com/G6R42A0N73"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block"
                  title="ادعمنا على Ko-fi ☕"
                >
                  <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height={30} loading="lazy" />
                </a>
              </p>
            )}
            <p className="mt-3 text-xs text-[var(--muted)] opacity-70">
              الآيات بخط عثماني من مصادر موثوقة | التلاوات من MP3Quran | التفاسير من مجمع الملك فهد
            </p>
          </footer>

          {surah && (
            <AudioBar
              show={section === "reader" || playing}
              surahName={surah.name}
              surahNumber={surah.number}
              audioRef={audioRef}
              reciter={settingsLS.value.reciter}
              speed={settingsLS.value.speed}
              volume={settingsLS.value.volume}
              autoNext={settingsLS.value.autoNext}
              repeatAyah={settingsLS.value.repeatAyah}
              currentTime={currentTime}
              duration={duration}
              onSettings={settingsLS.setValue}
              playing={playing}
              onPlaying={setPlaying}
              onTime={setCurrentTime}
              onDuration={setDuration}
              onAudioLoading={setAudioLoading}
              onOpenSurah={(n, autoplay) => {
                openSurah(n).then(() => {
                  if (autoplay) {
                    setTimeout(() => {
                      const a = audioRef.current;
                      if (a) a.play().catch(() => undefined);
                    }, 1500);
                  }
                });
              }}
              onToast={toast}
            />
          )}

          {/* رسالة مؤقتة */}
          {toastMsg && (
            <div className="modal-box right-1/2 translate-x-1/2 bottom-24 px-6 py-3 fade-in-up text-sm z-[970]">
              <span className="text-[var(--gold)] font-bold">{toastMsg}</span>
            </div>
          )}

          {/* شريط حالة عدم الاتصال — التطبيق يكمل بالسور المخزنة محلياً */}
          {!online && (
            <div
              className="px-4 py-2.5 text-center text-sm z-[890]"
              style={{ position: "fixed", bottom: 0, insetInline: 0, background: "var(--danger)", color: "#fff" }}
            >
              📵 لا يوجد اتصال بالإنترنت — ستصل بك السور والتفاسيرُ المحفوظة مسبقاً وستُحدَّث تلقائياً عند عودة الاتصال
            </div>
          )}
        </div>
      )}

      {/* نافذة التفسير */}
      {openTafsir && tafsirTarget && (
        <TafsirModal
          surah={tafsirTarget.surah}
          ayah={tafsirTarget.ayah}
          onClose={() => setOpenTafsir(false)}
          onNavigate={(nextAyah) => {
            setTafsirTarget((t) => (t ? { ...t, ayah: nextAyah } : t));
          }}
        />
      )}

      {/* عنصر الصوت (مخفي) */}
      <audio ref={audioRef} preload="metadata" />
    </>
  );
}
