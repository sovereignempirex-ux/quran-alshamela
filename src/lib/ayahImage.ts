// ============================================================
// مشاركة الآية كصورة — توليد صورة جميلة (1080×1080) على Canvas
// بخط المصحف وإطار ذهبي، ثم مشاركتها مباشرة (Web Share) أو تنزيلها.
// ============================================================

export interface AyahImageInfo {
  surahName: string;
  ayahNumber: number;
  text: string;
}

// استخراج عائلة خط المصحف المستخدمة فعلياً في الصفحة
function quranFontFamily(): string {
  try {
    const el = document.querySelector(".ayah-text");
    if (el) return getComputedStyle(el).fontFamily;
  } catch {
    /* تجاهل */
  }
  return '"Scheherazade New", "Amiri", serif';
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/).filter(Boolean);
  let y = startY;
  let line = "";
  ctx.textAlign = "center";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function makeAyahImage(info: AyahImageInfo): Promise<Blob | null> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // الخلفية: تدرج داكن فاخر
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d1421");
  bg.addColorStop(0.5, "#131c30");
  bg.addColorStop(1, "#0d1421");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // توهج ذهبي خفيف أعلى الصورة
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 620);
  glow.addColorStop(0, "rgba(255, 215, 0, 0.10)");
  glow.addColorStop(1, "rgba(255, 215, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // إطار ذهبي مزدوج
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = "rgba(255, 215, 0, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  // البسملة صغيرة أعلى
  ctx.direction = "rtl";
  ctx.fillStyle = "#ffd700";
  ctx.globalAlpha = 0.85;
  ctx.font = `34px ${quranFontFamily()}`;
  ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", W / 2, 140);
  ctx.globalAlpha = 1;

  // نص الآية — حجم خط يتكيف مع طول النص
  const len = info.text.length;
  const fontSize = len > 400 ? 34 : len > 220 ? 40 : len > 100 ? 48 : 56;
  ctx.font = `${fontSize}px ${quranFontFamily()}`;
  ctx.fillStyle = "#f4f6fb";
  const body = `﴿ ${info.text} ﴾`;
  const bottomY = drawWrapped(ctx, body, W / 2, 260, W - 200, fontSize * 1.9);

  // السطر التعريفي أسفل الآية
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold 36px ${quranFontFamily()}`;
  ctx.fillText(
    `— سورة ${info.surahName} · الآية ${info.ayahNumber} —`,
    W / 2,
    Math.max(bottomY + 60, H - 220)
  );

  // التذييل
  ctx.fillStyle = "rgba(244, 246, 251, 0.55)";
  ctx.font = `24px ${quranFontFamily()}`;
  ctx.fillText("مصحف الشاملة الإلكتروني 📖", W / 2, H - 110);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

// مشاركة الصورة مباشرة، أو تنزيلها إن لم تدعم المنصة المشاركة بالملفات
export async function shareAyahImage(
  info: AyahImageInfo
): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await makeAyahImage(info);
  if (!blob) return "failed";
  const file = new File([blob], `ayah-${info.surahName}-${info.ayahNumber}.png`, {
    type: "image/png",
  });
  const nav = navigator as Navigator & {
    canShare?: (d: unknown) => boolean;
  };
  try {
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({
        files: [file],
        title: "آية من القرآن الكريم",
        text: `﴿ ${info.text} ﴾\n— سورة ${info.surahName}، الآية ${info.ayahNumber}`,
      });
      return "shared";
    }
  } catch {
    return "failed"; // ألغى المستخدم أو فشل
  }
  // احتياطي: تنزيل الصورة
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
