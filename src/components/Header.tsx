"use client";

import { useEffect, useRef, useState } from "react";
import type { AppSettings, LastRead, SectionId } from "@/lib/types";
import { gregorianToday, hijriToday, toEasternNumbers } from "@/lib/utils";
import { reciters } from "@/lib/reciters";
import { KO_FI_URL } from "@/lib/kofi";

const BASE_TABS: { id: SectionId; label: string; icon: string }[] = [
  { id: "home", label: "الرئيسية", icon: "🏠" },
  { id: "surahs", label: "السور", icon: "📖" },
  { id: "search", label: "البحث", icon: "🔍" },
  { id: "favorites", label: "المفضلة", icon: "❤️" },
];

const DOWNLOAD_TAB: { id: SectionId; label: string; icon: string } = {
  id: "downloads",
  label: "تنزيل التطبيق",
  icon: "📥",
};

interface HeaderProps {
  section: SectionId;
  onSection: (s: SectionId) => void;
  settings: AppSettings;
  onSettings: (s: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  lastRead: LastRead | null;
  onContinue: (lr: LastRead) => void;
  showDownloads?: boolean;
  showDonate?: boolean;
}

export default function Header({
  section,
  onSection,
  settings,
  onSettings,
  lastRead,
  onContinue,
  showDownloads = false,
  showDonate = false,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [dates, setDates] = useState({ g: "", h: "" });
  const TABS = showDownloads ? [...BASE_TABS, DOWNLOAD_TAB] : BASE_TABS;

  useEffect(() => {
    setDates({ g: gregorianToday(), h: hijriToday() });
    const id = setInterval(() => setDates({ g: gregorianToday(), h: hijriToday() }), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="glass-header">
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          {/* الشعار */}
          <button
            onClick={() => onSection("home")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-2xl">📖</span>
            <span className="font-headings text-2xl font-bold gold-text">
              القرآن الكريم
            </span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* التواريخ */}
            <div className="card !p-2.5 !rounded-lg text-xs leading-5 hidden sm:block">
              <p className="text-[var(--gold)]">{dates.h}</p>
              <p className="text-[var(--muted)]">{dates.g}</p>
            </div>

            {/* زر التابع للقراءة */}
            {lastRead && (
              <button className="btn !py-1.5 text-xs" onClick={() => onContinue(lastRead)}>
                ⏮ متابعة: {lastRead.surahName} {lastRead.ayahNumber}
              </button>
            )}

            {/* الثيم والإعدادات */}
            {showDonate && (
              <a
                href={KO_FI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn !py-1.5 text-xs !bg-[#54b2c7] !text-white !border-[#54b2c7] hover:opacity-90"
                title="ادعمنا على Ko-fi ☕"
              >
                ☕ ادعمنا
              </a>
            )}
            <button
              className="btn-ghost !px-3 !py-1.5"
              title="تبديل الوضع"
              onClick={() =>
                onSettings((p) => ({
                  ...p,
                  theme:
                    p.theme === "dark" ? "light" : p.theme === "light" ? "auto" : "dark",
                }))
              }
            >
              {settings.theme === "dark" ? "☀️" : settings.theme === "light" ? "🌙" : "⏰"}
            </button>
            <button
              className="btn-ghost !px-3 !py-1.5"
              title="الإعدادات"
              onClick={() => setShowSettings((v) => !v)}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* التبويبات */}
        <nav className="flex gap-2 overflow-x-auto pb-3 mt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => onSection(t.id)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm transition-all duration-300 border ${
                section === t.id
                  ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)] font-bold"
                  : "bg-[var(--panel)] text-[var(--muted)] border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--gold)]"
              }`}
            >
              <span className="ml-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* لوحة الإعدادات */}
      {showSettings && (
        <>
          <div className="modal-backdrop" onClick={() => setShowSettings(false)} />
          <div className="modal-box right-1/2 translate-x-1/2 top-20 w-[min(92vw,420px)] p-6">
            <SettingsPanelInner
              settings={settings}
              onSettings={onSettings}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </>
      )}
    </header>
  );
}

function SettingsPanelInner({
  settings,
  onSettings,
  onClose,
}: {
  settings: AppSettings;
  onSettings: (s: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  onClose: () => void;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [backupNote, setBackupNote] = useState("");

  // مفاتيح البيانات التي تُصدَّر / تُستورد (نسخة احتياطية كاملة)
  const DATA_KEYS = [
    "quranAppSettings",
    "quranFavorites",
    "quranAyahBookmarks",
    "quranLastRead",
    "quranKhatma",
    "quranStats",
  ] as const;

  const exportBackup = () => {
    const backup: Record<string, unknown> = {
      app: "quran-alshamela",
      exportedAt: new Date().toISOString(),
    };
    for (const k of DATA_KEYS) {
      const raw = localStorage.getItem(k);
      if (raw !== null) {
        try {
          backup[k] = JSON.parse(raw);
        } catch {
          backup[k] = raw;
        }
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quran-alshamela-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNote("✓ تم تنزيل ملف النسخة الاحتياطية");
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        let restored = 0;
        for (const k of DATA_KEYS) {
          if (data[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(data[k]));
            restored++;
          }
        }
        if (!restored) {
          setBackupNote("⚠ الملف لا يحتوي بيانات التطبيق");
          return;
        }
        window.location.reload(); // إعادة التحميل لتطبيق البيانات فوراً
      } catch {
        setBackupNote("⚠ ملف غير صالح");
      }
    };
    reader.readAsText(file);
  };

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      {children}
    </div>
  );

  return (
    <div>
      <h3 className="section-title text-lg mb-3">⚙️ الإعدادات</h3>

      <Row label="المظهر">
        <div className="flex gap-2">
          {(["dark", "light", "auto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onSettings((p) => ({ ...p, theme: t }))}
              className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
                settings.theme === t
                  ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {t === "dark" ? "🌙 ليلي" : t === "light" ? "☀️ نهاري" : "⏰ تلقائي"}
            </button>
          ))}
        </div>
      </Row>

      <Row label="القارئ">
        <select
          className="input !py-1.5 !w-44 text-xs"
          value={settings.reciter}
          onChange={(e) => onSettings((p) => ({ ...p, reciter: e.target.value }))}
        >
          {reciters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Row>

      <Row label={`حجم خط الآيات (${settings.fontSize}px)`}>
        <div className="flex items-center gap-1.5">
          <button
            className="btn-ghost !px-2.5 !py-1 text-xs"
            onClick={() =>
              onSettings((p) => ({ ...p, fontSize: Math.max(20, p.fontSize - 2) }))
            }
          >
            −
          </button>
          <button
            className="btn-ghost !px-2.5 !py-1 text-xs"
            onClick={() =>
              onSettings((p) => ({ ...p, fontSize: Math.min(48, p.fontSize + 2) }))
            }
          >
            +
          </button>
        </div>
      </Row>

      <Row label="الورد اليومي المستهدف (آيات)">
        <div className="flex items-center gap-1.5">
          <button
            className="btn-ghost !px-2.5 !py-1 text-xs"
            onClick={() => onSettings((p) => ({ ...p, dailyGoal: Math.max(1, p.dailyGoal - 5) }))}
          >
            −
          </button>
          <span className="text-xs text-[var(--gold)] font-bold min-w-10 text-center">
            {toEasternNumbers(settings.dailyGoal)}
          </span>
          <button
            className="btn-ghost !px-2.5 !py-1 text-xs"
            onClick={() => onSettings((p) => ({ ...p, dailyGoal: Math.min(200, p.dailyGoal + 5) }))}
          >
            +
          </button>
        </div>
      </Row>

      <Row label="وضع الحفظ (تسميع)">
        <button
          onClick={() => onSettings((p) => ({ ...p, memorize: !p.memorize }))}
          className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
            settings.memorize
              ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {settings.memorize ? "🧠 يعمل" : "معطّل"}
        </button>
      </Row>

      <Row label="ترجمة إنجليزية تحت الآية">
        <button
          onClick={() => onSettings((p) => ({ ...p, showTranslation: !p.showTranslation }))}
          className={`px-4 py-1.5 rounded-full text-xs border transition-all ${
            settings.showTranslation
              ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]"
              : "border-[var(--border)] text-[var(--muted)]"
          }`}
        >
          {settings.showTranslation ? "🌐 مفعّلة" : "معطّلة"}
        </button>
      </Row>

      <Row label="طريقة العرض">
        <div className="flex gap-2">
          {(
            [
              { id: "continuous", label: "مُصْحَف متصل" },
              { id: "byline", label: "آية بسطر" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => onSettings((p) => ({ ...p, displayMode: m.id }))}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                settings.displayMode === m.id
                  ? "bg-[var(--gold)] text-[var(--bg)] border-[var(--gold)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Row>

      <Row label="تشغيل السورة التالية تلقائياً">
        <button
          onClick={() => onSettings((p) => ({ ...p, autoNext: !p.autoNext }))}
          className={`w-12 h-6.5 rounded-full transition-all relative ${
            settings.autoNext ? "bg-[var(--gold)]" : "bg-[var(--border)]"
          }`}
          style={{ height: 26 }}
        >
          <span
            className="absolute top-1 rounded-full bg-white shadow transition-all"
            style={{
              width: 18,
              height: 18,
              inset: settings.autoNext ? "inset-inline-start: 28px" : 4,
              insetInlineStart: settings.autoNext ? 28 : 4,
              insetBlockStart: 4,
            }}
          />
        </button>
      </Row>

      {/* النسخ الاحتياطي — تصدير/استيراد كل بيانات المستخدم */}
      <Row label="📤 تصدير بياناتي (نسخة احتياطية)">
        <button className="btn !py-1.5 text-xs" onClick={exportBackup}>
          تنزيل JSON
        </button>
      </Row>

      <Row label="📥 استيراد نسخة احتياطية">
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost !py-1.5 text-xs"
            onClick={() => importInputRef.current?.click()}
          >
            اختيار ملف
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-[var(--muted)]">{backupNote}</span>
        </div>
      </Row>

      <button className="btn-ghost w-full mt-4" onClick={onClose}>
        إغلاق
      </button>
    </div>
  );
}
