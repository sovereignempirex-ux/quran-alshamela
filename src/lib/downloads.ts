// ============================================================
// قائمة ملفات التنزيل (EXE/APK) متاحة في نسخة الويب فقط.
// الملفات تُرفع إلى GitHub Releases (scripts/gh-upload-release.ps1)
// وعند النشر المحلي يمكن عرضها من downloads ×: npm run web:downloads
// ============================================================

const APP_VERSION = "2.2.0";
const GIT_USER = "sovereignempirex-ux";
const GIT_REPO = "quran-alshamela";
export interface DownloadEntry {
  file: string; // اسم الملف داخل out/downloads
  title: string;
  desc: string;
  icon: string;
  kind: "exe-setup" | "exe-portable" | "apk";
  note: string;
  approxMB: string; // نص حجم تقريبي عند غياب Content-Length
}

interface EntryBase {
  title: string;
  desc: string;
  icon: string;
  kind: DownloadEntry["kind"];
  note: string;
  approxMB: string;
}

const entry = (base: EntryBase, file: string): DownloadEntry => ({
  ...base,
  file,
});

export function downloadEntries(): DownloadEntry[] {
  return [
    entry(
      {
        title: "مثبّت ويندوز (EXE)",
        desc: "تثبيت كامل على ويندوز مع اختصار سطح المكتب ودليل قائمة ابدأ.",
        icon: "🪟",
        kind: "exe-setup",
        note: "ويندوز 10/11 — 64 بت",
        approxMB: "≈115 MB",
      },
      `Quran-AlShamela Setup ${APP_VERSION}.exe`
    ),
    entry(
      {
        title: "نسخة محمولة (EXE)",
        desc: "يعمل مباشرة دون تثبيت — انسخ الملف في أي مجلد أو USB وشغّل.",
        icon: "🧳",
        kind: "exe-portable",
        note: "مناسب للنقل على فلاش ميموري",
        approxMB: "≈115 MB",
      },
      `Quran-AlShamela ${APP_VERSION}.exe`
    ),
    entry(
      {
        title: "تطبيق أندرويد (APK)",
        desc: "ثبّت على هاتفك — فعّل «التثبيت من مصادر غير معروفة» عند التثبيت.",
        icon: "🤖",
        kind: "apk",
        note: "أندرويد 6.0 وما فوق",
        approxMB: "≈5 MB",
      },
      `Quran-AlShamela-v${APP_VERSION}-debug.apk`
    ),
  ];
}

// عنوان GitHub Releases API لجلب أحجام الملفات (يدعم CORS من المتصفح)
export function releasesApiUrl(): string {
  return `https://api.github.com/repos/${GIT_USER}/${GIT_REPO}/releases/tags/v${APP_VERSION}`;
}

export function isExternalDownload(file: string): boolean {
  return file.replace(/\s+/g, ".").length > 0 && downloadUrl(file).startsWith("http");
}

export function downloadUrl(file: string): string {
  // GitHub Release يستبدل المسافات بالنقاط في أسماء ملفات المرفقات
  const urlName = file.replace(/\s+/g, ".");
  return `https://github.com/${GIT_USER}/${GIT_REPO}/releases/download/v${APP_VERSION}/${urlName}`;
}
