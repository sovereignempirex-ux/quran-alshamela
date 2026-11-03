// أدوات مساعدة عامة

// تحويل التاريخ إلى هجري باستخدام Intl (تقويم أم القرى) - دقيق
export function hijriToday(): string {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return fmt.format(new Date());
  } catch {
    return "";
  }
}

export function gregorianToday(): string {
  const fmt = new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return fmt.format(new Date());
}

// الوضع الليلي التلقائي: بعد 7 مساءً وحتى 6 صباحاً
export function autoThemeEffective(): boolean {
  const h = new Date().getHours();
  return h >= 19 || h < 6;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function pad3(n: number): string {
  return n.toString().padStart(3, "0");
}

// أرقام عربية مشرقية
const easternDigits = "٠١٢٣٤٥٦٧٨٩";
export function toEasternNumbers(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => easternDigits[Number(d)]);
}

// نص مشاركة لآية
export function ayahShareText(
  surahName: string,
  ayahNumber: number,
  text: string
): string {
  return `﴿ ${text} ﴾\n— سورة ${surahName}، الآية ${ayahNumber}\n\n📖 مصحف الشاملة الإلكتروني`;
}
