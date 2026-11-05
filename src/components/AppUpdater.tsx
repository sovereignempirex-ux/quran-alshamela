"use client";

import { useEffect, useRef } from "react";

// ============================================================
// التحديث الذاتي — يعمل في النسخة الويب وإلكترون (وكذلك داخل
// APK بعد أن يطبّق capacitor-updater الحزمة الجديدة):
// يفحص ملف /version.json دورياً (كل 5 دقائق) ويقارنه بإصدار
// لحظة الإقلاع؛ عند تغيّر الإصدار ينبّه المستخدم ثم يعيد
// تحميل الصفحة لإحضار النسخة الجديدة — دون تدخل المستخدم.
// ============================================================

export default function AppUpdater({ onToast }: { onToast: (m: string) => void }) {
  const bootVersionRef = useRef<string | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const fetchVersion = async (): Promise<string | null> => {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.version ? String(json.version) : null;
      } catch {
        return null; // بلا اتصال — نتجاهل بهدوء
      }
    };

    (async () => {
      const v = await fetchVersion();
      if (alive && v) bootVersionRef.current = v;
    })();

    const timer = setInterval(async () => {
      if (reloadingRef.current || !bootVersionRef.current) return;
      const v = await fetchVersion();
      if (!alive || !v) return;
      if (v !== bootVersionRef.current) {
        reloadingRef.current = true;
        onToast("⬇️ وصل تحديث جديد — جاري تحديث التطبيق تلقائياً...");
        setTimeout(() => window.location.reload(), 1800);
      }
    }, 300000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [onToast]);

  return null;
}
