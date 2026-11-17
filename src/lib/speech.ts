// ============================================================
// محرك التسميع الصوتي — نموذج مفتوح المصدر يعمل كلياً على جهاز المستخدم
// (Whisper Tiny عبر transformers.js — بلا سيرفر وبلا مفاتيح)
//
// المسار:
//  1) تسجيل صوت المستخدم (MediaRecorder)
//  2) تفريغ النص محلياً بالنموذج (whisper-tiny ~ 40MB تُنزَّل مرة
//     واحدة وتُخزَّن في ذاكرة الجهاز)
//  3) تطبيع النص العربي ومقارنة بالآية (خوارزمية LCS) — تصحيح
//     الأخطاء كلمة بكلمة: مطابق / خطأ / مفقود / زيادة
// ============================================================

// ---------- تحميل مكتبة transformers من CDN (خارج حزمة البناء) ----------
const TRANSFORMERS_CDN =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";

/* eslint-disable no-new-func */
function remoteImport(url: string): Promise<Record<string, unknown>> {
  return new Function(
    `return import(${JSON.stringify(url)})`
  )() as Promise<Record<string, unknown>>;
}

let asrPromise: Promise<AsrPipeline> | null = null;

export interface AsrPipeline {
  (audio: Float32Array, opts: { language: string; task: string }): Promise<{
    text: string;
  }>;
}

export interface ModelProgress {
  status: string;
  file?: string;
  progress?: number; // 0..100
}

// استعداد النموذج — يستدعى مرة واحدة ويُخزَّن بعدها في الذاكرة
export function getTranscriber(
  onProgress?: (p: ModelProgress) => void
): Promise<AsrPipeline> {
  if (!asrPromise) {
    asrPromise = (async () => {
      const mod = (await remoteImport(TRANSFORMERS_CDN)) as {
        pipeline: (
          task: string,
          model: string,
          opts: Record<string, unknown>
        ) => Promise<AsrPipeline>;
      };
      return await mod.pipeline(
        "automatic-speech-recognition",
        "Xenova/whisper-tiny",
        {
          dtype: "q8",
          progress_callback: (d: ModelProgress) => onProgress?.(d),
        }
      );
    })();
    asrPromise.catch(() => {
      asrPromise = null; // سقوط آمن — المحاولة القادمة تبدأ من جديد
    });
  }
  return asrPromise;
}

// هل جهاز هذا المستخدم قادر على تشغيل النموذج؟
export function isSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)
  );
}

// ---------- تفريغ الصوت إلى نص (محلياً) ----------
export async function transcribeBlob(
  blob: Blob,
  onProgress?: (p: ModelProgress) => void
): Promise<string> {
  const asr = await getTranscriber(onProgress);

  // فك الترميز وإعادة التردد إلى 16kHz أحادي (شرط النموذج)
  const buf = await blob.arrayBuffer();
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AC({ sampleRate: 16000 });
  const decoded = await ctx.decodeAudioData(buf);
  const audio = decoded.getChannelData(0);
  await ctx.close();

  const out = await asr(audio, { language: "arabic", task: "transcribe" });
  return (out.text || "").trim();
}

// ---------- تسجيل الصوت ----------
export class AudioRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) return reject(new Error("لا يوجد تسجيل جارٍ"));
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        this.recorder?.stream.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        resolve(blob);
      };
      this.recorder.stop();
    });
  }

  get active(): boolean {
    return this.recorder?.state === "recording";
  }
}

// ---------- تطبيع النص العربي للمقارنة ----------
// نزع التشكيل والتطويل وتوحيد الهمزات والألف والياء والتاء المربوطة
export function normalizeArabicText(text: string): string {
  return String(text)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u06DF\u06E0-\u06E8\u06EA-\u06ED]/g, "")
    .replace(/\u0640/g, "") // ـ تطويل
    .replace(/\u0671/g, "ا") // ٱ
    .replace(/[\u06E9]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u064A\s]/g, " ") // نزع الأرقام والرموز
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWords(text: string): string[] {
  return normalizeArabicText(text).split(" ").filter(Boolean);
}

// ---------- تقييم التسميع: مقارنة كلمة بكلمة (LCS) ----------
export type WordStatus = "ok" | "missed";

export interface WordGrade {
  word: string; // الكلمة المتوقعة (الأصلية مشكّلة)
  status: WordStatus;
}

export interface ReciteGrade {
  expected: WordGrade[]; // حالة كل كلمة من الآية
  extras: string[]; // كلمات قالتها ولم توجد في الآية
  matched: number;
  total: number;
  score: number; // 0..100
}

export function gradeRecitation(
  recitedText: string,
  expectedOriginal: string
): ReciteGrade {
  const R = normalizeWords(recitedText);
  const E_raw = expectedOriginal.split(/\s+/).filter(Boolean);
  const E = E_raw.map((w) => normalizeArabicText(w));

  const n = R.length;
  const m = E.length;
  if (m === 0) {
    return { expected: [], extras: [], matched: 0, total: 0, score: 0 };
  }

  // جدول LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        R[i] === E[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // تتبع المطابقات
  const matchedAt = new Set<number>(); // فهارس الكلمات المتوقعة المتطابقة
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (R[i] === E[j]) {
      matchedAt.add(j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  // كلمات متروكة: كل كلمة متوقعة غير متطابقة، وزِع الكلمات المتروكة
  // من كلام المستخدم عليها بالترتيب (لعرض "قلت: ..." بجوار الخاطئة)
  const recitedMatched = new Set<number>();
  // إعادة تتبع لتسجيل أزواج التطابق حرفياً
  i = 0;
  j = 0;
  const pairs = new Map<number, number>(); // expected index → recited index
  while (i < n && j < m) {
    if (R[i] === E[j]) {
      pairs.set(j, i);
      recitedMatched.add(i);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const expected: WordGrade[] = E_raw.map((w, idx) => ({
    word: w,
    status: matchedAt.has(idx) ? "ok" : "missed",
  }));

  const extras = R.filter((_, idx) => !recitedMatched.has(idx));
  const matched = matchedAt.size;

  return {
    expected,
    extras,
    matched,
    total: m,
    score: Math.round((matched / m) * 100),
  };
}
