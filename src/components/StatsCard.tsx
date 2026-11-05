"use client";

import type { StatsData } from "@/lib/stats";
import { bestStreak, currentStreak, getDay, last7, lastNDaysTotal } from "@/lib/stats";
import { toEasternNumbers } from "@/lib/utils";

interface StatsCardProps {
  stats: StatsData;
  goal: number;
  onGoal: (g: number) => void;
}

const MAX_BAR = 100;

export default function StatsCard({ stats, goal, onGoal }: StatsCardProps) {
  const today = getDay(stats);
  const streak = currentStreak(stats);
  const best = bestStreak(stats);
  const week = lastNDaysTotal(stats, 7);
  const days = last7(stats);
  const maxDay = Math.max(MAX_BAR, ...days.map((d) => d.v));
  const pct = Math.min(100, goal > 0 ? Math.round((today.v / goal) * 100) : 0);
  const done = goal > 0 && today.v >= goal;

  return (
    <div className="card !p-6 md:!p-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h3 className="section-title !text-xl">📊 إحصاءات قراءتك</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">الورد اليومي:</span>
          <div className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5">
            <button
              className="text-[var(--muted)] hover:text-[var(--gold)] px-1 cursor-pointer"
              title="إنقاص الهدف"
              onClick={() => onGoal(Math.max(1, goal - 5))}
            >
              −
            </button>
            <span className="text-xs text-[var(--gold)] font-bold min-w-10 text-center">
              {toEasternNumbers(goal)} آية
            </span>
            <button
              className="text-[var(--muted)] hover:text-[var(--gold)] px-1 cursor-pointer"
              title="زيادة الهدف"
              onClick={() => onGoal(Math.min(200, goal + 5))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* شريط الورد اليومي */}
      <div className="mb-5">
        <div className="flex justify-between items-baseline mb-2 text-sm">
          <span className="text-[var(--gold)] font-bold">
            🔥 سلسلة {toEasternNumbers(streak)} {streak === 1 ? "يوم" : "أيام"}
            {best > streak && (
              <span className="text-[10px] text-[var(--muted)] font-normal"> · الأفضل {toEasternNumbers(best)}</span>
            )}
          </span>
          <span className={done ? "text-[var(--gold)] font-bold" : "text-[var(--muted)]"}>
            {done ? `أتممت الورد ✓ ${toEasternNumbers(today.v)}` : `${toEasternNumbers(today.v)} / ${toEasternNumbers(goal)} آية`}
          </span>
        </div>
        <div
          className="h-3 rounded-full overflow-hidden"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: done
                ? "linear-gradient(90deg, var(--gold), #7ed957)"
                : "var(--gold)",
            }}
          />
        </div>
        {done && (
          <p className="text-[11px] text-[var(--gold)] mt-2 opacity-80">
            🌿 بارك الله فيك — أتممت وردك اليوم، أحل الله بركة في قراءتك
          </p>
        )}
      </div>

      {/* أيام الأسبوع */}
      <div className="flex justify-between items-end gap-1.5">
        {days.map((d, i) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-md relative"
              style={{
                height: 44,
                background: "var(--border)",
                overflow: "hidden",
                opacity: d.v > 0 || i === 6 ? 1 : 0.45,
              }}
              title={`${d.label}: ${d.v} آية`}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  insetInline: 0,
                  height: `${Math.round((d.v / maxDay) * 100)}%`,
                  background:
                    i === 6 ? "var(--gold)" : "color-mix(in srgb, var(--gold) 55%, transparent)",
                  transition: "height .4s ease",
                }}
              />
              {d.v > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    insetInline: 0,
                    fontSize: 9,
                    color: "var(--gold)",
                    fontWeight: 700,
                  }}
                >
                  {toEasternNumbers(d.v)}
                </span>
              )}
            </div>
            <span className="text-[9px] text-[var(--muted)]">{d.label}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-[var(--muted)] opacity-60 mt-3">
        هذا الأسبوع: {toEasternNumbers(week)} آية · سور أتممتها اليوم: {toEasternNumbers(today.s)}
      </p>
    </div>
  );
}
