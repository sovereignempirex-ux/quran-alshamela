// ============================================================
// مشاركة الآية كصورة — توليد صورة جميلة (1080×1080) على Canvas
// بخط المصحف وإطار ذهبي، ثم مشاركتها مباشرة (Web Share) أو تنزيلها.
// ============================================================

export interface AyahImageInfo {
  surahName: string;
  ayahNumber: number;
  text: string;
}

// خلفيات جاهزة للصورة
export type AyahBg = "night" | "dawn" | "geometric";

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

export function makeAyahImage(
  info: AyahImageInfo,
  opts?: { bg?: AyahBg; tafsir?: string | null }
): Promise<Blob | null> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // الخلفية حسب القالب المختار
  const bgKind = opts?.bg || "night";
  if (bgKind === "night") {
    // ليل فاخر: تدرج داكن
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0d1421");
    bg.addColorStop(0.5, "#131c30");
    bg.addColorStop(1, "#0d1421");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  } else if (bgKind === "dawn") {
    // فجر: تدرج ذهبي دافئ
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#2b1a05");
    bg.addColorStop(0.45, "#4a2c0d");
    bg.addColorStop(0.75, "#7a4a14");
    bg.addColorStop(1, "#a86c20");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  } else {
    // هندسي: قماش هندسي إسلامي على خلفية داكنة
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0f1a17");
    bg.addColorStop(1, "#15241f");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = "rgba(140, 200, 150, 0.10)";
    ctx.lineWidth = 2;
    const step = 90;
    for (let y = 0; y <= H + step; y += step) {
      for (let x = 0; x <= W + step; x += step) {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a1 = (k * Math.PI) / 4;
          const a2 = ((k + 1) * Math.PI) / 4;
          ctx.moveTo(x + 45 * Math.cos(a1), y + 45 * Math.sin(a1));
          ctx.lineTo(x + 45 * Math.cos(a2), y + 45 * Math.sin(a2));
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

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

  // نص الآية — حجم خط يتكيف مع طول النص (يصغر إن وُجد تفسير)
  const hasTafsir = !!opts?.tafsir;
  const len = info.text.length + (hasTafsir ? opts!.tafsir!.length * 0.6 : 0);
  const fontSize = len > 400 ? 30 : len > 220 ? 36 : len > 100 ? 44 : 52;
  ctx.font = `${fontSize}px ${quranFontFamily()}`;
  ctx.fillStyle = "#f4f6fb";
  const body = `﴿ ${info.text} ﴾`;
  let bottomY = drawWrapped(ctx, body, W / 2, 250, W - 200, fontSize * 1.9);

  // السطر التعريفي أسفل الآية
  ctx.fillStyle = "#ffd700";
  ctx.font = `bold 36px ${quranFontFamily()}`;
  ctx.fillText(
    `— سورة ${info.surahName} · الآية ${info.ayahNumber} —`,
    W / 2,
    bottomY + 24
  );
  bottomY += 60;

  // التفسير الميسّر (اختياري)
  if (hasTafsir) {
    ctx.fillStyle = "rgba(244, 246, 251, 0.82)";
    ctx.font = `28px ${quranFontFamily()}`;
    bottomY = drawWrapped(ctx, `التفسير الميسّر: ${opts!.tafsir}`, W / 2, bottomY + 40, W - 220, 46);
  }

  // التذييل
  ctx.fillStyle = "rgba(244, 246, 251, 0.55)";
  ctx.font = `24px ${quranFontFamily()}`;
  ctx.fillText("مصحف الشاملة الإلكتروني 📖", W / 2, H - 110);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.95));
}

// مشاركة الصورة مباشرة، أو تنزيلها إن لم تدعم المنصة المشاركة بالملفات
export async function shareAyahImage(
  info: AyahImageInfo,
  opts?: { bg?: AyahBg; tafsir?: string | null }
): Promise<"shared" | "downloaded" | "failed"> {
  const blob = await makeAyahImage(info, opts);
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
