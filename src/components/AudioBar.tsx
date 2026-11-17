"use client";

import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "@/lib/types";
import { reciters, getReciter } from "@/lib/reciters";
import { formatTime, pad3 } from "@/lib/utils";
import { surahData } from "@/lib/surahData";
import { getOfflineAudio } from "@/lib/audioStore";

interface AudioBarProps {
  show: boolean;
  surahName: string;
  surahNumber: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  reciter: string;
  speed: number;
  volume: number;
  autoNext: boolean;
  repeatAyah: boolean;
  offlineTick: number; // يتغير عند تنزيل/حذف تلاوة — لإعادة فحص المصدر المحلي
  currentTime: number;
  duration: number;
  onSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  playing: boolean;
  onPlaying: (b: boolean) => void;
  onTime: (t: number) => void;
  onDuration: (d: number) => void;
  onAudioLoading: (b: boolean) => void;
  onOpenSurah: (n: number, autoplay?: boolean) => void;
  onToast: (m: string) => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function AudioBar({
  show,
  surahName,
  surahNumber,
  audioRef,
  reciter,
  speed,
  volume,
  autoNext,
  repeatAyah,
  offlineTick,
  currentTime,
  duration,
  onSettings,
  playing,
  onPlaying,
  onTime,
  onDuration,
  onAudioLoading,
  onOpenSurah,
  onToast,
}: AudioBarProps) {
  const [minimized, setMinimized] = useState(true);
  const reciterInfo = getReciter(reciter);
  const srcRef = useRef("");
  const [error, setError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // == مؤقت النوم: يوقف التلاوة بعد المدة المحددة ==
  const SLEEP_OPTIONS = [0, 10, 20, 30, 60] as const; // بالدقائق، 0 = بدون
  const [sleepIdx, setSleepIdx] = useState(0);
  const [sleepLeft, setSleepLeft] = useState(0); // ثوانٍ متبقية
  const [sleepOverlay, setSleepOverlay] = useState(false); // شاشة النوم (سوداء موفر للطاقة)

  useEffect(() => {
    if (sleepLeft <= 0) return;
    const id = setInterval(() => {
      setSleepLeft((s) => {
        if (s <= 1) {
          // انتهى المؤقت: أوقف التلاوة
          const audio = audioRef.current;
          if (audio) audio.pause();
          onToast("⏱ انتهى مؤقت النوم — أُوقفت التلاوة. تصبح على خير 🌙");
          setSleepOverlay(false);
          setSleepIdx(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepLeft > 0]);

  const cycleSleep = () => {
    const next = (sleepIdx + 1) % SLEEP_OPTIONS.length;
    setSleepIdx(next);
    const mins = SLEEP_OPTIONS[next];
    if (mins === 0) {
      setSleepLeft(0);
      onToast("⏱ أُلغي مؤقت النوم");
    } else {
      setSleepLeft(mins * 60);
      onToast(`⏱ سيقف الصوت بعد ${mins} دقيقة`);
    }
  };

  const sleepLabel = () => {
    const m = SLEEP_OPTIONS[sleepIdx];
    if (m === 0) return "⏱ نوم";
    const mm = Math.floor(sleepLeft / 60);
    const ss = sleepLeft % 60;
    return `🌙 ${mm}:${String(ss).padStart(2, "0")}`;
  };

  // تجهيز المصدر عند تغير السورة أو القارئ — الأوفلاين أولاً:
  // إن كانت التلاوة محفوظة على الجهاز نشغّلها من IndexedDB دون أي إنترنت
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    const applySrc = (url: string, offline: boolean) => {
      if (srcRef.current === url) return;
      srcRef.current = url;
      audio.src = url;
      audio.playbackRate = speed;
      audio.volume = volume;
      setError(false);
      onAudioLoading(true);
      audio.load();
    };

    (async () => {
      const blob = await getOfflineAudio(reciter, surahNumber);
      if (cancelled) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setIsOffline(true);
        applySrc(objectUrl, true);
      } else {
        setIsOffline(false);
        applySrc(`${reciterInfo.server}/${pad3(surahNumber)}.mp3`, false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber, reciterInfo.server, reciter, offlineTick]);

  // الربط بالأحداث
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => onPlaying(true);
    const onPause = () => onPlaying(false);
    const onTimeUpdate = () => onTime(audio.currentTime);
    const onMeta = () => {
      onDuration(audio.duration);
      onAudioLoading(false);
    };
    const onErr = () => {
      onAudioLoading(false);
      setError(true);
    };
    const onWaiting = () => onAudioLoading(true);
    const onPlayingEv = () => onAudioLoading(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onErr);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlayingEv);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onErr);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlayingEv);
    };
  }, [audioRef, onAudioLoading, onDuration, onPlaying, onTime]);

  // نهاية السورة: التكرار أولاً ثم الانتقال للتالية
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      onPlaying(false);
      // تكرار التلاوة: إعادة نفس السورة من البداية
      if (repeatAyah) {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
        onPlaying(true);
        onToast("🔁 أُعيدت التلاوة من البداية");
        return;
      }
      if (!autoNext) return;
      const next = surahNumber === 114 ? 1 : surahNumber + 1;
      onToast(`الانتقال إلى سورة ${surahData.find((s) => s.number === next)?.name} ▶`);
      onOpenSurah(next, true);
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [audioRef, autoNext, repeatAyah, surahNumber, onOpenSurah, onPlaying, onToast]);

  // السرعة والمستوى
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [audioRef, speed]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [audioRef, volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => onToast("تعذر تشغيل التلاوة، تحقق من الاتصال"));
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!audio || !audio.duration) return;
    const ratio = (rect.right - e.clientX) / rect.width; // RTL
    audio.currentTime = Math.max(0, Math.min(ratio * audio.duration, audio.duration - 1));
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    onSettings((p) => ({ ...p, speed: SPEEDS[(idx + 1) % SPEEDS.length] }));
  };

  const pct = duration ? (currentTime / duration) * 100 : 0;

  if (!show) return null;

  return (
    <div className="audio-bar fade-in-up">
      <div className="max-w-6xl mx-auto">
        {!minimized && (
          <div className="flex items-center gap-3 flex-wrap mb-2.5 px-1">
            {/* اختيار القارئ */}
            <select
              className="input !py-1.5 !w-auto text-xs max-w-[220px]"
              value={reciter}
              onChange={(e) => onSettings((p) => ({ ...p, reciter: e.target.value }))}
            >
              {reciters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* مستوى الصوت */}
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => onSettings((p) => ({ ...p, volume: Number(e.target.value) / 100 }))}
              className="w-24 accent-[var(--gold)]"
              title="مستوى الصوت"
            />

            {/* سرعة التلاوة */}
            <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={cycleSpeed}>
              ⏩ {speed}x
            </button>

            <button
              className="btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => onSettings((p) => ({ ...p, autoNext: !p.autoNext }))}
            >
              {autoNext ? "🔁 تتابع السور: مفعّل" : "↪ تتابع السور: معطل"}
            </button>

            <button
              className="btn-ghost !py-1.5 !px-3 text-xs"
              onClick={() => onSettings((p) => ({ ...p, repeatAyah: !p.repeatAyah }))}
              title="إعادة نفس السورة عند نهايتها"
            >
              {repeatAyah ? "🔂 التكرار: مفعّل" : "🔂 التكرار: معطل"}
            </button>

            {/* مؤقت النوم + شاشة النوم */}
            <button
              className="btn-ghost !py-1.5 !px-3 text-xs"
              onClick={cycleSleep}
              title="مؤقت النوم: يوقف التلاوة تلقائياً بعد المدة المحددة"
            >
              {sleepLabel()}
            </button>
            {playing && (
              <button
                className="btn-ghost !py-1.5 !px-3 text-xs"
                onClick={() => setSleepOverlay(true)}
                title="شاشة النوم: شاشة سوداء توفر البطارية أثناء الاستماع قبل النوم"
              >
                🌙 وضع النوم
              </button>
            )}

            {/* تنزيل */}
            <a
              className="btn-ghost !py-1.5 !px-3 text-xs"
              href={`${reciterInfo.server}/${pad3(surahNumber)}.mp3`}
              download={`${surahName}-${reciterInfo.name}.mp3`}
              target="_blank"
              rel="noreferrer"
            >
              ⬇ تنزيل
            </a>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button className="play-btn !w-10 !h-10 !text-base shrink-0" onClick={togglePlay}>
            {playing ? "⏸" : "▶"}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-xs font-bold text-[var(--gold)] truncate">
                🎧 سورة {surahName}
                {isOffline && (
                  <span
                    className="meta-tag mr-2 !py-0 !px-2 !text-[10px]"
                    title="تعمل من التلاوة المحفوظة على جهازك — بدون إنترنت"
                  >
                    📴 بدون نت
                  </span>
                )}
                {error && <span className="text-[var(--danger)] mr-2">⚠ تعذر تحميل الصوت</span>}
              </span>
              <span className="text-[11px] text-[var(--muted)] shrink-0" dir="ltr">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="progress-bar" onClick={seek}>
              <div className="progress-fill" style={{ width: `${100 - pct}%` }} />
              <div
                className="progress-knob"
                style={{ insetInlineEnd: `${100 - pct}%` }}
              />
            </div>
          </div>

          <button
            className="btn-ghost !px-3 shrink-0"
            title={minimized ? "خيارات التلاوة" : "تصغير"}
            onClick={() => setMinimized((v) => !v)}
          >
            {minimized ? "⌃" : "⌄"}
          </button>
        </div>
      </div>

      {/* == شاشة النوم: سوداء موفر للطاقة — تلاوة تعمل والشاشة بالكاد تنير == */}
      {sleepOverlay && (
        <div
          className="sleep-overlay"
          onClick={() => setSleepOverlay(false)}
          title="اضغط للخروج من وضع النوم"
        >
          <div className="text-center select-none" onClick={(e) => e.stopPropagation()}>
            <p className="text-[var(--muted)] text-sm mb-2 opacity-50">🎧 تلاوة تعمل الآن</p>
            <p className="font-headings text-xl text-[#5a5f6b] mb-8">سورة {surahName}</p>
            <button
              className="rounded-full mx-auto mb-8 cursor-pointer"
              style={{
                width: 74,
                height: 74,
                border: "1.5px solid #3a3f4b",
                color: "#8a8f98",
                fontSize: 28,
                background: "#12151c",
              }}
              onClick={() => {
                const audio = audioRef.current;
                if (!audio) return;
                if (playing) audio.pause();
                else audio.play().catch(() => undefined);
              }}
            >
              {playing ? "⏸" : "▶"}
            </button>
            {sleepLeft > 0 && (
              <p className="text-[#5a5f6b] text-sm" dir="ltr">
                ⏱ {Math.floor(sleepLeft / 60)}:{String(sleepLeft % 60).padStart(2, "0")}
              </p>
            )}
            <p className="text-[#3a3f4b] text-[11px] mt-10 opacity-60">
              🌙 وضع النوم — شاشة داكنة توفر البطارية · اضغط في أي مكان للخروج
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
