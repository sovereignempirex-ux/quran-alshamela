"use client";

import { useEffect, useState } from "react";
import { downloadEntries, downloadUrl, type DownloadEntry } from "@/lib/downloads";
import { toEasternNumbers } from "@/lib/utils";

// كشف بيئة التشغيل: إلكترون يفتح التطبيق بـ ?env=desktop، والكاباسيتور عبر window.Capacitor
function detectNative(): "web" | "electron" | "android" {
  if (typeof window === "undefined") return "web";
  const envParam = new URLSearchParams(window.location.search).get("env");
  if (envParam === "desktop") return "electron";
  if (typeof (window as { Capacitor?: unknown }).Capacitor !== "undefined") return "android";
  return "web";
}

interface FileStatus {
  ok: boolean;
  sizeMB?: number;
}

export default function DownloadsSection() {
  const env = detectNative();
  const [entries] = useState<DownloadEntry[]>(() => downloadEntries());
  const [status, setStatus] = useState<Record<string, FileStatus>>({});
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (env !== "web") {
      setChecking(false);
      return;
    }
    let alive = true;
    (async () => {
      const next: Record<string, FileStatus> = {};
      await Promise.all(
        entries.map(async (e) => {
          try {
            const res = await fetch(downloadUrl(e.file), { method: "HEAD" });
            const len = Number(res.headers?.get("content-length") || 0);
            next[e.file] = { ok: res.ok, sizeMB: len };
          } catch {
            next[e.file] = { ok: false };
          }
        })
      );
      if (alive) {
        setStatus(next);
        setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [env, entries]);

  if (env !== "web") {
    // داخل التطبيقات (EXE/APK) لا داعي لقسم التنزيل
    return (
      <div className="card !rounded-3xl text-center py-16 fade-in">
        <p className="text-5xl mb-4">✅</p>
        <p className="text-xl font-headings text-[var(--gold)] mb-2">أنت تستخدم التطبيق المثبّت</p>
        <p className="text-[var(--muted)]">
          هذا القسم متاح في نسخة الويب فقط — لتوزيع الحزم افتح موقع التطبيق من المتصفح.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-5">
      {/* رأس القسم */}
      <div className="card !rounded-3xl text-center">
        <p className="text-5xl mb-3">📥</p>
        <h2 className="font-headings text-2xl md:text-3xl font-bold text-[var(--gold)]">
          تنزيل تطبيق «مصحف الشاملة»
        </h2>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-xl mx-auto leading-6">
          نسخة سطح المكتب لويندوز ونسخة جوال لأندرويد — نفس الموادّ، والتطبيق يعمل من جهازك
          مباشرة دون سيرفر، مع إمكانية عمله من الذاكرة المحلية أثناء انقطاع الإنترنت.
        </p>
      </div>

      {/* البطاقات */}
      <div className="grid sm:grid-cols-3 gap-4">
        {entries.map((e) => {
          const st = status[e.file];
          const available = !checking && st?.ok;
          return (
            <div key={e.file} className="card !rounded-3xl flex flex-col items-center text-center !p-6">
              <p className="text-4xl mb-3">{e.icon}</p>
              <p className="font-headings font-bold text-[var(--gold)]">{e.title}</p>
              <p className="text-xs text-[var(--muted)] mt-2 flex-1 leading-5">{e.desc}</p>

              <p className="mt-3 text-[11px] text-[var(--muted)] opacity-80">
                {checking
                  ? "جاري التحقق..."
                  : available
                    ? st?.sizeMB
                      ? `${toEasternNumbers(Math.round(st.sizeMB / (1024 * 1024)))} MB`
                      : e.approxMB
                    : "غير متاح حالياً"}
              </p>

              {available ? (
                <a
                  href={downloadUrl(e.file)}
                  download
                  className="btn mt-4 !w-full !py-2.5 text-sm"
                  title={`تنزيل ${e.file}`}
                >
                  ⬇️ تنزيل الملف
                </a>
              ) : (
                <button className="btn-ghost mt-4 !w-full !py-2.5 text-sm" disabled style={{ opacity: 0.5 }}>
                  {checking ? "⏳ جاري الفحص" : "🚫 غير متاح"}
                </button>
              )}

              <p className="mt-3 text-[10px] text-[var(--muted)] opacity-60">{e.note}</p>
            </div>
          );
        })}
      </div>

      {/* تعليمات التثبيت */}
      <div className="card !rounded-3xl !p-6 text-sm leading-7">
        <p className="font-headings text-[var(--gold)] font-bold mb-3">📌 تعليمات سريعة</p>
        <ol className="list-decimal ps-6 space-y-2 text-[var(--muted)]">
          <li>
            <b className="text-[var(--gold)]">ويندوز:</b> شغّل «مثبّت ويندوز» واتبع الخطوات — أو استخدم «النسخة المحمولة» دون تثبيت. إذا ظهر تحذير SmartScreen اضغط «معلومات أكثر ← تشغيل على أي حال» (الملف موقّع ذاتياً).
          </li>
          <li>
            <b className="text-[var(--gold)]">أندرويد:</b> من ملف APK اضغط «تثبيت» ووافق على تنبيه الحماية «التثبيت من مصادر غير معروفة» لجهازك.
          </li>
          <li>
            <b className="text-[var(--gold)]">دون إنترنت:</b> التطبيق يحفظ كل سورة أو تفسير تفتحه في الذاكرة المحلية، فتعود إليها فوراً حتى بلا نت، ثم تتجدد تلقائياً عند رجوع الاتصال.
          </li>
        </ol>
      </div>
    </div>
  );
}
