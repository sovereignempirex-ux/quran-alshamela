"use client";

import { useEffect, useRef, useState } from "react";
import type { AppSettings } from "@/lib/types";
import { reciters, getReciter } from "@/lib/reciters";
import { formatTime, pad3 } from "@/lib/utils";
import { surahData } from "@/lib/surahData";

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

  // تجهيز المصدر عند تغير السورة أو القارئ
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const url = `${reciterInfo.server}/${pad3(surahNumber)}.mp3`;
    if (srcRef.current === url) return;
    srcRef.current = url;
    audio.src = url;
    audio.playbackRate = speed;
    audio.volume = volume;
    setError(false);
    onAudioLoading(true);
    audio.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber, reciterInfo.server]);

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
    </div>
  );
}
