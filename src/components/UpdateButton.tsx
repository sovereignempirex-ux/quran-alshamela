"use client";

import { useEffect, useState } from "react";
import {
  isAppEnv,
  checkAppUpdate,
  applyAppUpdate,
  RELEASES_URL,
  type UpdateCheck,
} from "@/lib/appUpdate";

// ============================================================
// زر التحديث داخل التطبيق — يظهر فقط في EXE و APK (وليس الويب)
// يعرض دائماً الإصدار الحالي، ويتوهّج عند توفر تحديث جديد،
// وبالضغط يُثبّت التحديث داخل التطبيق (تنزيل + إعادة تشغيل).
// ============================================================

export default function UpdateButton({ onToast }: { onToast: (m: string) => void }) {
  const [show, setShow] = useState(false);
  const [check, setCheck] = useState<UpdateCheck | null>(null);
  const [busy, setBusy] = useState(false);

  // فحص أولي عند الإقلاع + كل 15 دقيقة
  useEffect(() => {
    if (!isAppEnv()) return;
    setShow(true);
    let alive = true;
    const run = async () => {
      const c = await checkAppUpdate();
      if (alive && c) setCheck(c);
    };
    run();
    const id = setInterval(run, 15 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // استمع لأحداث إلكترون (مراحل التثبيت)
  useEffect(() => {
    const api = window.desktopAPI;
    if (!api?.onUpdateEvent) return;
    return api.onUpdateEvent((data) => {
      if (data.stage === "downloading") onToast("⬇ جاري تنزيل التحديث...");
      else if (data.stage === "extracting") onToast("📦 جاري تثبيت التحديث...");
      else if (data.stage === "done") onToast("✅ اكتمل التحديث — إعادة التشغيل...");
      else if (data.stage === "error") {
        setBusy(false);
        onToast("⚠ تعذر التحديث — جاري فتح صفحة الإصدارات");
        window.open(RELEASES_URL, "_blank");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = async () => {
    if (busy) return;
    let c = check;
    if (!c) {
      setBusy(true);
      c = await checkAppUpdate();
      setBusy(false);
      setCheck(c);
      if (!c) {
        onToast("⚠ تعذر فحص التحديث — تحقق من اتصالك بالإنترنت");
        return;
      }
    }
    if (!c.available) {
      onToast(`✓ أنت على أحدث إصدار (v${c.current})`);
      return;
    }
    setBusy(true);
    onToast(`⬆ جاري التحديث إلى v${c.latest}...`);
    const ok = await applyAppUpdate(c, onToast);
    if (!ok && !window.desktopAPI) setBusy(false);
    // في إلكترون: التطبيق يُعاد تشغيله تلقائياً بعد التثبيت
    // في أندرويد: reload() يعيد تحميل الواجهة بالنسخة الجديدة
  };

  if (!show) return null;

  const hasUpdate = check?.available === true;

  return (
    <button
      onClick={onClick}
      className={`${hasUpdate ? "btn pulse-gold" : "btn-ghost"} !py-1.5 text-xs shrink-0`}
      title={
        hasUpdate
          ? `تحديث متوفر: v${check?.latest} — اضغط للتحديث الآن`
          : "فحص وجود تحديث جديد"
      }
    >
      {busy ? "⏳ جاري..." : hasUpdate ? `⬆ تحديث v${check?.latest}` : `⬆ v${check?.current || ""}`}
    </button>
  );
}
