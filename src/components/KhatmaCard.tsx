"use client";

import type { FavoriteSurah } from "@/lib/types";
import { toEasternNumbers } from "@/lib/utils";

interface KhatmaCardProps {
  completed: number[];
  lastCompleted: FavoriteSurah | null;
  onReset: () => void;
}

export default function KhatmaCard({
  completed,
  lastCompleted,
  onReset,
}: KhatmaCardProps) {
  const done = completed.length;
  const pct = Math.round((done / 114) * 100);

  return (
    <div className="card !p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="section-title !text-xl">🕋 متتبّع الختمة</h3>
        {done > 0 && (
          <button
            className="btn-ghost !py-1 !px-3 text-[11px] text-[var(--danger)]"
            onClick={onReset}
          >
            بدء ختمة جديدة
          </button>
        )}
      </div>

      <div className="flex items-center gap-5 flex-wrap">
        {/* حلقة التقدم */}
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ width: 92, height: 92 }}
        >
          <svg width="92" height="92" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="9" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 264} 264`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="absolute text-center">
            <span className="block font-headings text-xl font-bold text-[var(--gold)]">
              {toEasternNumbers(pct)}٪
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-[180px]">
          <p className="leading-7 text-sm">
            أكملت <span className="text-[var(--gold)] font-bold">{toEasternNumbers(done)}</span> من{" "}
            {toEasternNumbers(114)} سورة — {done === 0 && "ابدأ طريقك نحو الختمة ✨"}
            {done > 0 && done < 114 && "واصل، تأتيك الختمة بإذن الله 🤲"}
            {done === 114 && "ما شاء الله، كتمت القرآن كاملاً! تقبّل الله 🎉"}
          </p>
          {lastCompleted && (
            <p className="text-[11px] text-[var(--muted)] mt-2 opacity-80">
              آخر سورة: سورة {lastCompleted.name}
            </p>
          )}
          <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, var(--gold), #ffed4e)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
