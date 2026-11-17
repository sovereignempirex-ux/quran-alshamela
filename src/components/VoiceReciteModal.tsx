"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Ayah, SurahMeta } from "@/lib/types";
import {
  AudioRecorder,
  gradeRecitation,
  isSpeechSupported,
  transcribeBlob,
  type ModelProgress,
  type ReciteGrade,
} from "@/lib/speech";
import { toEasternNumbers } from "@/lib/utils";
import { normalizeWords } from "@/lib/speech";
import { recordAyahResult, recordWrongWords } from "@/lib/review";

// ============================================================
// التسميع الصوتي — اسجّل حفظك بالمايك ويقيّمك التطبيق كلمة كلمة
// التفريغ الصوتي يعمل كلياً على جهازك بنموذج مفتوح المصدر
// (Whisper Tiny عبر transformers.js) — لا يُرسَل صوتك لأي سيرفر.
// ============================================================

interface VoiceReciteProps {
  surah: SurahMeta;
  ayahs: Ayah[];
  onClose: () => void;
}

type Phase = "setup" | "recording" | "processing" | "result";

export default function VoiceReciteModal({ surah, ayahs, onClose }: VoiceReciteProps) {
  const supported = useMemo(() => isSpeechSupported(), []);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(1);
  const [phase, setPhase] = useState<Phase>("setup");
  const [modelPct, setModelPct] = useState<number | null>(null); // تنزيل النموذج %
  const [error, setError] = useState("");
  const [grade, setGrade] = useState<ReciteGrade | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // الهدف: نص الآيات المختارة كاملاً (للمقارنة)
  const expectedText = useMemo(() => {
    const a = Math.max(1, Math.min(from, ayahs.length));
    const b = Math.max(a, Math.min(to, ayahs.length));
    return ayahs
      .slice(a - 1, b)
      .map((v) => v.text_uthmani.replace(/[\u06DD\u066D\u0660-\u0669]+/g, "").trim())
      .join(" ");
  }, [ayahs, from, to]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recorderRef.current?.stop().catch(() => undefined);
    };
  }, []);

  const startRecording = async () => {
    setError("");
    if (recSeconds > 90) {
      setError("التسجيل أطول من اللازم — اسمِع مقطعاً أقصر (أقل من 90 ثانية)");
      return;
    }
    setPhase("recording");
    setRecSeconds(0);
    try {
      const rec = new AudioRecorder();
      recorderRef.current = rec;
      await rec.start();
      timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setPhase("setup");
      setError("تعذر الوصول للمايك — اسمح للتطبيق باستخدام الميكروفون");
    }
  };

  const stopAndProcess = async () => {
    const rec = recorderRef.current;
    if (!rec || !rec.active) {
      setPhase("setup");
      return;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("processing");
    setModelPct(null);
    try {
      const blob = await rec.stop();
      blobRef.current = blob;
      const text = await transcribeBlob(blob, (p: ModelProgress) => {
        if (p.status === "progress" && typeof p.progress === "number") {
          setModelPct(Math.round(p.progress));
        }
      });
      if (!text) {
        setError("لم أسمع كلاماً واضحاً — قرّب المايك واقرأ بصوت أعلى");
        setPhase("setup");
        return;
      }
      const g = gradeRecitation(text, expectedText);
      setGrade(g);
      setPhase("result");
      // تسجيل النتائج: نتيجة لكل آية ضمن النطاق + الكلمات الخاطئة للنظام
      const a = Math.max(1, Math.min(from, ayahs.length));
      const b = Math.max(a, Math.min(to, ayahs.length));
      const ayahTexts = ayahs.slice(a - 1, b);
      const nEach = Math.floor(g.expected.length / Math.max(1, ayahTexts.length));
      ayahTexts.forEach((_, i) => {
        // نقاط تقديرية لكل آية: نسبة الكلمات المتطابقة ضمن نطاقها
        const sliceStart = i * nEach;
        const sliceEnd = i === ayahTexts.length - 1 ? g.expected.length : (i + 1) * nEach;
        let ok = 0;
        for (let k = sliceStart; k < sliceEnd; k++) if (g.expected[k]?.status === "ok") ok++;
        const ayahScore = Math.round((ok / Math.max(1, sliceEnd - sliceStart)) * 100);
        recordAyahResult(`${surah.number}:${a + i}`, ayahScore, []);
      });
      // الكلمات المتروكة/الخاطئة → تسجيلها كأخطاء متكررة
      recordWrongWords(normalizeWords(g.extras.join(" ")), `${surah.number}:${a}`);
    } catch (e) {
      setError(
        e instanceof Error && /network|fetch|download/i.test(e.message)
          ? "تعذر تنزيل النموذج — يلزم إنترنت أول مرة فقط (40MB) ثم يعمل بدون نت"
          : "حدث خطأ أثناء المعالجة — حاول مجدداً"
      );
      setPhase("setup");
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorderRef.current?.stop();
    } catch {
      /* تجاهل */
    }
    recorderRef.current = null;
    setPhase("setup");
  };

  const reset = () => {
    setGrade(null);
    setError("");
    setModelPct(null);
    setPhase("setup");
  };

  if (!supported) {
    return (
      <>
        <div className="modal-backdrop" onClick={onClose} />
        <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,560px)] p-6 md:p-8 text-center">
          <p className="text-4xl mb-3">🎤</p>
          <h3 className="section-title !text-xl mb-2">التسميع الصوتي غير مدعوم</h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            جهازك أو متصفحك لا يدعم تسجيل الصوت. جرب متصفحاً أحدث أو تطبيق EXE/APK.
          </p>
          <button className="btn !py-2 text-sm" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </>
    );
  }

  const scoreColor =
    grade && grade.score >= 80
      ? "var(--gold)"
      : grade && grade.score >= 50
      ? "var(--text)"
      : "var(--danger)";

  return (
    <>
      <div className="modal-backdrop" onClick={phase === "recording" ? undefined : onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,640px)] max-h-[88vh] overflow-y-auto p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title !text-xl">🎤 التسميع الصوتي</h3>
          <button
            className="btn-ghost !px-3 !py-1 text-xs"
            onClick={() => {
              if (phase === "recording") cancelRecording();
              else onClose();
            }}
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[var(--muted)] mb-4">
          سورة {surah.name} — سجّل تسميعك بالمايك والذكاء يقارنها بالآية كلمة كلمة
          <span className="block mt-1 opacity-70">
            🔒 يُعالَج الصوت كلياً على جهازك بنموذج مفتوح المصدر — لا يُرسَل لأي سيرفر
          </span>
        </p>

        {/* اختيار نطاق الآيات */}
        {phase === "setup" && (
          <div className="mb-4">
            <p className="text-sm text-[var(--muted)] mb-2">اختر الآيات التي ستسمّعها:</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--muted)]">من آية</label>
              <select
                className="select !py-1.5 !px-2 text-sm"
                value={from}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFrom(v);
                  if (to < v) setTo(v);
                }}
              >
                {ayahs.map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {toEasternNumbers(i + 1)}
                  </option>
                ))}
              </select>
              <label className="text-xs text-[var(--muted)]">إلى</label>
              <select
                className="select !py-1.5 !px-2 text-sm"
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
              >
                {ayahs.map((_, i) => (
                  <option key={i + 1} value={i + 1} disabled={i + 1 < from}>
                    {toEasternNumbers(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <details className="mt-3 text-xs text-[var(--muted)]">
              <summary className="cursor-pointer text-[var(--gold)]">عرض الآيات المطلوبة</summary>
              <p className="ayah-text mt-2 leading-loose text-[var(--text)]" dir="rtl">
                {expectedText}
              </p>
            </details>
          </div>
        )}

        {error && (
          <p className="text-sm text-[var(--danger)] mb-4 rounded-xl p-3 border border-[var(--danger)] bg-[rgba(229,72,77,0.08)]">
            {error}
          </p>
        )}

        {/* الشاشة حسب المرحلة */}
        {phase === "setup" && (
          <div className="text-center">
            <button
              className="btn !py-3 !px-10 text-base rounded-full"
              onClick={startRecording}
            >
              🎙 ابدأ التسميع
            </button>
            <p className="text-[11px] text-[var(--muted)] mt-3">
              أول مرة يُنزَّل نموذج التعرف الصوتي (~40MB) ثم يعمل بدون إنترنت
            </p>
          </div>
        )}

        {phase === "recording" && (
          <div className="text-center py-4">
            <div
              className="mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                width: 96,
                height: 96,
                border: "3px solid var(--danger)",
                animation: "recPulse 1.2s ease-in-out infinite",
                fontSize: 40,
              }}
            >
              🎙
            </div>
            <p className="text-2xl font-bold text-[var(--danger)] mb-1" dir="ltr">
              {Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, "0")}
            </p>
            <p className="text-xs text-[var(--muted)] mb-5">يسجّل الآن... اقرأ الآيات بصوت واضح</p>
            <div className="flex gap-2 justify-center">
              <button className="btn !py-2.5 text-sm" onClick={stopAndProcess}>
                ⏹ انتهيت — قيّم تسميعي
              </button>
              <button className="btn-ghost !py-2.5 text-sm" onClick={cancelRecording}>
                إلغاء
              </button>
            </div>
          </div>
        )}

        {phase === "processing" && (
          <div className="text-center py-10">
            <div className="loader-ring mb-5" />
            {modelPct !== null ? (
              <>
                <p className="text-sm text-[var(--gold)] mb-2">
                  تنزيل نموذج التعرف الصوتي... {toEasternNumbers(modelPct)}%
                </p>
                <div className="progress-bar max-w-xs mx-auto">
                  <div className="progress-fill" style={{ width: `${modelPct}%` }} />
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-2">
                  مرة واحدة فقط — يُخزَّن بعدها على جهازك
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--gold)]">جاري تفريغ الصوت ومقارنته بالآية...</p>
            )}
          </div>
        )}

        {phase === "result" && grade && (
          <div>
            {/* النتيجة */}
            <div className="text-center mb-4">
              <p className="text-5xl font-bold mb-1" style={{ color: scoreColor }}>
                {toEasternNumbers(grade.score)}%
              </p>
              <p className="text-xs text-[var(--muted)]">
                طابقت {toEasternNumbers(grade.matched)} من {toEasternNumbers(grade.total)} كلمة
              </p>
            </div>

            {/* النص المتوقع ملوّناً */}
            <div
              className="rounded-2xl p-4 mb-3 border border-[var(--border)]"
              style={{ background: "var(--panel)" }}
            >
              <p className="ayah-text leading-loose text-justify" dir="rtl">
                {grade.expected.map((w, i) => (
                  <span
                    key={i}
                    style={
                      w.status === "ok"
                        ? { color: "#2ecc71" }
                        : { color: "var(--danger)", textDecoration: "underline dotted" }
                    }
                    title={w.status === "ok" ? "صحيحة ✓" : "لم تُقرأ ✗"}
                  >
                    {w.word}{" "}
                  </span>
                ))}
              </p>
            </div>

            {/* الكلمات الزائدة/المشوَّهة */}
            {grade.extras.length > 0 && (
              <div className="rounded-xl p-3 mb-3 border border-[var(--border)] text-xs">
                <p className="text-[var(--muted)] mb-1">
                  🗣 قلت كلمات لم توجد في الآية (خطأ أو تشويه):
                </p>
                <p dir="rtl" className="text-[var(--danger)]">
                  {grade.extras.slice(0, 25).join(" · ")}
                  {grade.extras.length > 25 && " ..."}
                </p>
              </div>
            )}

            <p className="text-[11px] text-[var(--muted)] text-center mb-4">
              🟩 أخضر = صحيحة · 🟥 أحمر = ناقصة أو خاطئة — أعد المحاولة لتحسين نتيجتك
            </p>

            <div className="flex gap-2 justify-center flex-wrap">
              <button className="btn !py-2 text-sm" onClick={reset}>
                🔄 حاول مرة أخرى
              </button>
              <button
                className="btn-ghost !py-2 text-sm"
                onClick={() => {
                  reset();
                  const next = Math.min(ayahs.length, to + 1);
                  setFrom(next);
                  setTo(next);
                }}
              >
                ⏭ الآية التالية
              </button>
              <button className="btn-ghost !py-2 text-sm" onClick={onClose}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
