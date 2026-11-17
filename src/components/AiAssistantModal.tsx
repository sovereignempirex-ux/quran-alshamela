"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================
// المساعد الذكي القرآني — مجاني 100%:
//  1) ☁️ سحابي مجاني بلا مفتاح: text.pollinations.ai (نموذج مفتوح)
//  2) 💻 محلي على جهازك: WebLLM (Qwen2.5-0.5B مفتوح المصدر عبر
//     WebGPU) — إن كان جهازك يدعم WebGPU، يعمل بدون إنترنت بعد أول تنزيل
// ============================================================

interface AiAssistantModalProps {
  onClose: () => void;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT =
  "أنت مساعد قرآني عربي داخل تطبيق «مصحف الشاملة». أجب بالعربية الفصحى المبسطة وبإيجاز (3-6 أسطر). " +
  "استشهد بالآيات بالاسم ورقم الآية عند الحاجة. لا تُصدر أحكاماً شرعية قاطعة (فتوى) بل تنقل أقوال أهل العلم بصيغة " +
  "«قال العلماء / أفتى كذا»، وإن لم تكن متأكداً قل «لا أعلم» بصراحة. " +
  "أنت تخدم القراءة والتفسير والدعاء والأخلاق — ارفض بأدب أي طلب خارج هذا النطاق.";

const PROVIDER_KEY = "quranAiProvider"; // "cloud" | "local"

// ---------- المزود السحابي المجاني (بلا مفتاح وبلا تسجيل) ----------
async function askCloud(messages: ChatMsg[]): Promise<string> {
  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
    }),
  });
  if (!res.ok) throw new Error("cloud-failed");
  const text = await res.text();
  try {
    // قد يرد JSON أو نصاً خاماً
    const j = JSON.parse(text);
    return j.choices?.[0]?.message?.content || text;
  } catch {
    return text;
  }
}

// ---------- المزود المحلي (WebLLM — نموذج مفتوح المصدر داخل جهازك) ----------
const WEBLLM_CDN = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm";
const LOCAL_MODEL = "Qwen2.5-0.5B-Instruct-q4f16-1-MLC";

function remoteImport(url: string): Promise<Record<string, unknown>> {
  /* eslint-disable no-new-func */
  return new Function(`return import(${JSON.stringify(url)})`)() as Promise<Record<string, unknown>>;
}

interface LocalEngine {
  chat: {
    completions: {
      create: (opts: {
        messages: { role: string; content: string }[];
        temperature?: number;
        stream?: boolean;
      }) => Promise<{
        choices: { message: { content: string } }[];
      }>;
    };
  };
}

let enginePromise: Promise<LocalEngine> | null = null;

function webgpuSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

async function getLocalEngine(onProgress?: (msg: string, pct: number | null) => void): Promise<LocalEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      onProgress?.("جاري تحميل مكتبة النموذج المحلي...", null);
      const mod = (await remoteImport(WEBLLM_CDN)) as {
        CreateMLCEngine: (
          model: string,
          opts?: { initProgressCallback?: (r: { text: string; progress: number }) => void }
        ) => Promise<LocalEngine>;
      };
      return await mod.CreateMLCEngine(LOCAL_MODEL, {
        initProgressCallback: (r) => {
          const pct = Number.isFinite(r?.progress) ? Math.round(r.progress * 100) : null;
          onProgress?.(r?.text || "جاري تحضير النموذج...", pct);
        },
      });
    })();
    enginePromise.catch(() => {
      enginePromise = null;
    });
  }
  return enginePromise;
}

export default function AiAssistantModal({ onClose }: AiAssistantModalProps) {
  const [provider, setProvider] = useState<"cloud" | "local">("cloud");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // حالة تحميل النموذج المحلي
  const [statusPct, setStatusPct] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [localReady, setLocalReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // قراءة المزود المحفوظ
  useEffect(() => {
    const saved = localStorage.getItem(PROVIDER_KEY);
    if (saved === "local" && webgpuSupported()) setProvider("local");
    else if (saved === "local") localStorage.removeItem(PROVIDER_KEY);
  }, []);

  // التمرير لأسفل عند كل رسالة
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const pickProvider = (p: "cloud" | "local") => {
    setProvider(p);
    setError("");
    localStorage.setItem(PROVIDER_KEY, p);
  };

  // تهيئة النموذج المحلي عند اختياره
  const initLocal = async () => {
    setError("");
    try {
      await getLocalEngine((msg, pct) => {
        setStatus(msg);
        setStatusPct(pct);
      });
      setLocalReady(true);
      setStatus("");
      setStatusPct(null);
    } catch {
      setError("جهازك لا يدعم WebGPU أو فشل تحميل النموذج المحلي — استخدم الخيار السحابي");
      setProvider("cloud");
      setLocalReady(false);
    }
  };

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const answer =
        provider === "cloud"
          ? await askCloud(next.slice(-10))
          : await (async () => {
              const engine = await getLocalEngine();
              const res = await engine.chat.completions.create({
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...next],
                temperature: 0.7,
              });
              return res.choices?.[0]?.message?.content || "لم أعرف الإجابة";
            })();
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch {
      setError("تعذر الوصول للمساعد — تأكد من اتصالك وحاول مجدداً");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={busy ? undefined : onClose} />
      <div className="modal-box right-1/2 translate-x-1/2 top-1/2 -translate-y-1/2 w-[min(94vw,600px)] h-[min(86vh,680px)] flex flex-col p-5 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="section-title !text-xl">🤖 المساعد الذكي القرآني</h3>
          <button
            className="btn-ghost !px-3 !py-1 text-xs"
            onClick={() => {
              if (!busy) onClose();
            }}
          >
            ✕
          </button>
        </div>

        {/* اختيار المزود */}
        <div className="flex gap-2 mb-3 flex-wrap items-center">
          <button
            onClick={() => pickProvider("cloud")}
            className={`!py-1.5 !px-3 text-xs ${provider === "cloud" ? "btn" : "btn-ghost"}`}
            title="مجاني بلا مفتاح — يحتاج إنترنت"
          >
            ☁️ سحابي مجاني
          </button>
          <button
            onClick={() => {
              pickProvider("local");
              if (!localReady) initLocal();
            }}
            className={`!py-1.5 !px-3 text-xs ${provider === "local" ? "btn" : "btn-ghost"}`}
            title="نموذج مفتوح المصدر يعمل على جهازك عبر WebGPU — بدون إنترنت بعد أول تنزيل"
            disabled={!webgpuSupported()}
          >
            💻 محلي (على جهازك){!webgpuSupported() ? " — غير مدعوم" : ""}
          </button>
        </div>

        {(provider === "local" && status) && (
          <div className="mb-2">
            <p className="text-[11px] text-[var(--gold)] mb-1 truncate">{status}</p>
            {statusPct !== null && (
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${statusPct}%` }} />
              </div>
            )}
          </div>
        )}

        {error && <p className="text-xs text-[var(--danger)] mb-2">{error}</p>}

        {/* المحادثة */}
        <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-sm text-[var(--muted)] mb-4">
                اسأل عن تفسير آية، أو سبب نزولها، أو دعاء، أو معنى كلمة...
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {["ما هو سبب نزول سورة الكهف؟", "ما معنى «غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ»؟", "اذكر دعاء السفر"].map(
                  (s) => (
                    <button
                      key={s}
                      className="btn-ghost !py-1.5 !px-3 text-[11px]"
                      onClick={() => setInput(s)}
                    >
                      {s}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-7 whitespace-pre-wrap"
                dir="rtl"
                style={
                  m.role === "user"
                    ? { background: "var(--panel)", border: "1px solid var(--border)" }
                    : { background: "var(--gold-soft)", border: "1px solid var(--gold)" }
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-end">
              <div
                className="rounded-2xl px-4 py-2.5 text-sm"
                style={{ background: "var(--gold-soft)", border: "1px solid var(--gold)" }}
              >
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>·</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* الإدخال */}
        <div className="flex gap-2">
          <input
            className="input flex-1 !py-2.5 text-sm"
            placeholder="اكتب سؤالك هنا..."
            dir="rtl"
            value={input}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn !py-2.5 !px-5 text-sm" onClick={send} disabled={busy || !input.trim()}>
            إرسال ➤
          </button>
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-2 text-center opacity-70">
          🤖 الذكاء الاصطناعي قد يخطئ — راجع الفتاوى والمعلومات الشرعية مع أهل العلم
        </p>
      </div>
    </>
  );
}
