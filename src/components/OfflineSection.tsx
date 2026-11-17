"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings, SurahMeta } from "@/lib/types";
import { surahData } from "@/lib/surahData";
import { reciters, getReciter } from "@/lib/reciters";
import {
  downloadSurahAudio,
  deleteOfflineAudio,
  deleteOfflineReciter,
  listOfflineReciter,
  storageUsage,
  formatBytes,
  type OfflineTrack,
} from "@/lib/audioStore";
import { toEasternNumbers } from "@/lib/utils";

interface OfflineSectionProps {
  reciter: string;
  onSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  onToast: (m: string) => void;
  onAudioChanged: () => void;
}

export default function OfflineSection({
  reciter,
  onSettings,
  onToast,
  onAudioChanged,
}: OfflineSectionProps) {
  const [downloaded, setDownloaded] = useState<Map<number, number>>(new Map());
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [downloading, setDownloading] = useState<number | null>(null); // السورة الجاري تنزيلها
  const [queueProgress, setQueueProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const reciterInfo = getReciter(reciter);

  const refresh = useCallback(async () => {
    const [map, st] = await Promise.all([
      listOfflineReciter(reciter),
      storageUsage(),
    ]);
    setDownloaded(map);
    setStorage(st);
  }, [reciter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const downloadedCount = downloaded.size;
  const downloadedBytes = [...downloaded.values()].reduce((a, b) => a + b, 0);

  // تنزيل سورة واحدة
  const downloadOne = async (s: SurahMeta): Promise<boolean> => {
    try {
      setDownloading(s.number);
      await downloadSurahAudio(reciter, reciterInfo.server, s.number);
      await refresh();
      onAudioChanged();
      return true;
    } catch (e) {
      console.error(e);
      onToast(`⚠ تعذر تنزيل سورة ${s.name} — تحقق من الاتصال`);
      return false;
    } finally {
      setDownloading(null);
    }
  };

  // تنزيل مجموعة سور بالتتابع (قائمة انتظار)
  const downloadMany = async (list: SurahMeta[]) => {
    if (downloading !== null) return;
    cancelRef.current = false;
    const pending = list.filter((s) => !downloaded.has(s.number));
    if (!pending.length) {
      onToast("✓ كل السور المحددة محفوظة محلياً");
      return;
    }
    setQueueProgress({ done: 0, total: pending.length });
    let ok = 0;
    for (const s of pending) {
      if (cancelRef.current) break;
      const success = await downloadOne(s);
      if (success) ok++;
      setQueueProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setDownloading(null);
    setQueueProgress({ done: 0, total: 0 });
    if (cancelRef.current) onToast("⏸ أُوقفت قائمة التنزيل");
    else onToast(`✅ اكتمل تنزيل ${toEasternNumbers(ok)} سورة — تعمل الآن بدون نت`);
  };

  const removeOne = async (n: number) => {
    await deleteOfflineAudio(reciter, n);
    await refresh();
    onAudioChanged();
  };

  const clearReciter = async () => {
    cancelRef.current = true;
    setDownloading(null);
    await deleteOfflineReciter(reciter);
    await refresh();
    onAudioChanged();
    onToast("🗑 حُذفت تلاوات هذا القارئ من جهازك");
  };

  const playingNow = downloading !== null;
  const allDone = downloadedCount === 114;

  return (
    <div className="fade-in-up">
      <h2 className="section-title mb-1">📴 التلاوات بدون نت</h2>
      <p className="text-sm text-[var(--muted)] mb-5">
        نزّل تلاوات قارئك المفضل على جهازك مرة واحدة، ثم استخدم التطبيق{" "}
        <span className="text-[var(--gold)] font-bold">دون إنترنت إطلاقاً</span> —
        القراءة والاستماع والتفاسير المحفوظة كلها تعمل أوفلاين.
      </p>

      {/* اختيار القارئ */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[var(--muted)]">القارئ:</span>
          <select
            className="input !py-2 !w-auto text-sm max-w-[280px]"
            value={reciter}
            onChange={(e) =>
              onSettings((p) => ({ ...p, reciter: e.target.value }))
            }
          >
            {reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--gold)]">
            محفوظ محلياً: {toEasternNumbers(downloadedCount)} / ١١٤ سورة
            {downloadedBytes > 0 && ` (${formatBytes(downloadedBytes)})`}
          </span>
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2 flex-wrap mt-4">
          <button
            className="btn !py-2 text-sm"
            disabled={playingNow || allDone}
            onClick={() => downloadMany(surahData)}
          >
            {allDone ? "✅ المصحف كامل محفوظ" : "⬇ نزّل المصحف كاملاً (١١٤ سورة)"}
          </button>
          {playingNow && (
            <button
              className="btn-ghost !py-2 text-sm"
              onClick={() => {
                cancelRef.current = true;
                onToast("⏸ سيُوقَف التنزيل بعد السورة الحالية");
              }}
            >
              ⏸ إيقاف قائمة التنزيل
            </button>
          )}
          <button
            className="btn-ghost !py-2 text-sm"
            disabled={playingNow}
            onClick={() => setConfirmClear(true)}
          >
            🗑 حذف تلاوات هذا القارئ
          </button>
        </div>

        {/* شريط تقدم قائمة الانتظار */}
        {queueProgress.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--gold)] font-bold">
                {downloading !== null
                  ? `⬇ جاري: سورة ${surahData.find((s) => s.number === downloading)?.name}`
                  : "..."}
              </span>
              <span className="text-[var(--muted)]">
                {toEasternNumbers(queueProgress.done)} / {toEasternNumbers(queueProgress.total)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(queueProgress.done / queueProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {storage.quota > 0 && (
          <p className="text-[11px] text-[var(--muted)] mt-3">
            💾 مساحة جهازك المتاحة للتطبيق: {formatBytes(storage.usage)} مستخدمة من{" "}
            {formatBytes(storage.quota)}
          </p>
        )}
      </div>

      {/* شبكة السور */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {surahData.map((s) => {
          const size = downloaded.get(s.number);
          const isDone = size !== undefined;
          const isDownloading = downloading === s.number;
          return (
            <div
              key={s.number}
              className={`card !p-3 flex items-center justify-between gap-2 ${
                isDone ? "border-[var(--gold)]" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  {toEasternNumbers(s.number)}. {s.name}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  {isDone
                    ? `✓ محفوظة (${formatBytes(size)})`
                    : isDownloading
                    ? "⬇ جاري التنزيل..."
                    : "غير محفوظة"}
                </p>
              </div>
              {isDownloading ? (
                <span className="loader-ring !w-5 !h-5 !border-2 shrink-0" />
              ) : isDone ? (
                <button
                  className="btn-ghost !px-2 !py-1 text-[11px] shrink-0"
                  title="حذف من الجهاز"
                  onClick={() => removeOne(s.number)}
                >
                  🗑
                </button>
              ) : (
                <button
                  className="btn !px-2.5 !py-1 text-[11px] shrink-0"
                  disabled={playingNow}
                  onClick={() => downloadOne(s)}
                >
                  ⬇ نزّل
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* تأكيد الحذف */}
      {confirmClear && (
        <>
          <div className="modal-backdrop" onClick={() => setConfirmClear(false)} />
          <div className="modal-box right-1/2 translate-x-1/2 top-1/3 w-[min(92vw,380px)] p-6 text-center">
            <p className="text-lg mb-2">🗑 حذف تلاوات القارئ؟</p>
            <p className="text-sm text-[var(--muted)] mb-5">
              سيُحذف كل ملفات تلاوة <span className="text-[var(--gold)] font-bold">{reciterInfo.name}</span>{" "}
              المحفوظة على جهازك ({toEasternNumbers(downloadedCount)} سورة). يمكنك
              إعادة تنزيلها لاحقاً.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                className="btn !border-[var(--danger)] !text-[var(--danger)] !bg-transparent"
                onClick={async () => {
                  setConfirmClear(false);
                  await clearReciter();
                }}
              >
                نعم، احذف
              </button>
              <button className="btn-ghost" onClick={() => setConfirmClear(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
