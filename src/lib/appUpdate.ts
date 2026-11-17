// ============================================================
// التحديث داخل التطبيق — خاص بنسختي EXE و APK (لا يظهر على الويب)
// يفحص GitHub Releases ويقارن بالإصدار المحلي (version.json)،
// ويثبّت التحديث مباشرة:
//  - إلكترون (EXE): عبر desktopAPI (IPC) — تنزيل + تثبيت + إعادة تشغيل
//  - أندرويد (APK): عبر @capgo/capacitor-updater — تنزيل web-app.zip + reload
//  - احتياطي: فتح صفحة الإصدارات في المتصفح الخارجي
// ============================================================

const REPO = "sovereignempirex-ux/quran-alshamela";
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

// واجهة إلكترون المكشوفة عبر preload (contextBridge)
declare global {
  interface Window {
    desktopAPI?: {
      isDesktop: boolean;
      getVersion(): Promise<string>;
      checkUpdate(): Promise<{ available: boolean; latest: string }>;
      applyUpdate(): Promise<boolean>;
      onUpdateEvent(
        cb: (data: { stage: string; message?: string }) => void
      ): () => void;
    };
  }
}

export interface UpdateCheck {
  available: boolean;
  current: string;
  latest: string;
  zipUrl: string | null;
}

// هل نحن داخل تطبيق سطح مكتب أو جوال (وليس موقع ويب)؟
export function isAppEnv(): boolean {
  if (typeof window === "undefined") return false;
  if (window.desktopAPI?.isDesktop) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("env") === "desktop") return true;
  const Cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (Cap?.isNativePlatform?.()) return true;
  if (
    /Android/i.test(navigator.userAgent) &&
    /(;\s*wv\))/i.test(navigator.userAgent)
  ) {
    return true;
  }
  return false;
}

// مقارنة إصدارات a.b.c — هل a أحدث من b؟
export function isNewerVersion(a: string, b: string): boolean {
  const p = (s: string) =>
    String(s)
      .replace(/^v/, "")
      .split(".")
      .map((x) => parseInt(x, 10) || 0);
  const A = p(a);
  const B = p(b);
  for (const i of [0, 1, 2]) {
    if ((A[i] || 0) > (B[i] || 0)) return true;
    if ((A[i] || 0) < (B[i] || 0)) return false;
  }
  return false;
}

// فحص وجود إصدار أحدث (يعمل داخل التطبيقات والويب)
export async function checkAppUpdate(): Promise<UpdateCheck | null> {
  try {
    const [curRes, relRes] = await Promise.all([
      fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" }),
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" },
      }),
    ]);
    if (!curRes.ok || !relRes.ok) return null;
    const cur = String((await curRes.json())?.version || "");
    const rel = await relRes.json();
    const latest = String(rel?.tag_name || "").replace(/^v/, "");
    if (!cur || !latest) return null;
    const asset = (rel.assets || []).find(
      (a: { name?: string }) => a?.name === "web-app.zip"
    ) as { browser_download_url?: string } | undefined;
    return {
      available: isNewerVersion(latest, cur),
      current: cur,
      latest,
      zipUrl: asset?.browser_download_url || null,
    };
  } catch {
    return null; // بلا اتصال — تجاهل بهدوء
  }
}

// تطبيق التحديث حسب بيئة التشغيل
export async function applyAppUpdate(
  check: UpdateCheck,
  onEvent: (msg: string) => void
): Promise<boolean> {
  // 1) إلكترون — الرئيسية تنزّل وتُثبّت وتُعيد تشغيل التطبيق
  if (window.desktopAPI?.applyUpdate) {
    return window.desktopAPI.applyUpdate();
  }

  // 2) أندرويد (كاباسيتور) — capacitor-updater ينزّل web-app.zip ويُعيد التحميل
  const Cap = (
    window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  if (Cap?.isNativePlatform?.() && check.zipUrl) {
    try {
      onEvent("⬇ جاري تنزيل التحديث...");
      const mod = (await import("@capgo/capacitor-updater")) as unknown as {
        CapacitorUpdater: {
          download: (o: { url: string; version: string }) => Promise<unknown>;
          reload: () => Promise<unknown>;
        };
      };
      const { download, reload } = mod.CapacitorUpdater;
      await download({ url: check.zipUrl, version: `v${check.latest}` });
      onEvent("✅ حُمّل التحديث — جاري إعادة التشغيل...");
      await reload();
      return true;
    } catch (e) {
      console.error("تعذر تطبيق التحديث عبر capacitor-updater", e);
    }
  }

  // 3) احتياطي — افتح صفحة الإصدارات في المتصفح الخارجي
  window.open(RELEASES_URL, "_blank");
  return false;
}
