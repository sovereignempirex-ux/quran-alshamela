"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPrayerTimes } from "@/lib/api";
import { toEasternNumbers } from "@/lib/utils";

interface PrayerTimesData {
  timings: Record<string, string>;
  hijri?: { day: string; month: string; year: string } | null;
  meta?: { timezone?: string; method?: string };
}

const PRAYER_ORDER = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
const PRAYER_AR: Record<string, string> = {
  Fajr: "الفجر",
  Sunrise: "الشروق",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

export default function PrayerTimesCard() {
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const qs = geo ? [geo.lat, geo.lon] : [undefined, undefined];
    (async () => {
      try {
        const json = await fetchPrayerTimes(qs[0], qs[1]);
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "تعذر جلب المواقيت");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [geo]);

  // نبض الساعة كل دقيقة لحساب الصلاة القادمة
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // الصلاة القادمة والوقت المتبقي
  const next = useMemo(() => {
    if (!data) return null;
    const list = PRAYER_ORDER.map((key) => {
      const [h, m] = data.timings[key].slice(0, 5).split(":").map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return { key, at: d, label: PRAYER_AR[key], time: data.timings[key].slice(0, 5) };
    });
    const nextUp = list.find((p) => p.at.getTime() > now.getTime());
    return nextUp || { ...list[0], at: new Date(list[0].at.getTime() + 86400000) };
  }, [data, now]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4)),
        }),
      () => undefined,
      { timeout: 8000 }
    );
  };

  const remaining = useMemo(() => {
    if (!next) return null;
    let ms = next.at.getTime() - now.getTime();
    const hours = Math.floor(ms / 3600000);
    ms -= hours * 3600000;
    const mins = Math.max(0, Math.floor(ms / 60000));
    return { hours, mins };
  }, [next, now]);

  // == اتجاه القبلة: زاوية الحضيء من الشمال إلى الكعبة (صيغة البيرنج الدائري) ==
  const KAABA = { lat: 21.4225, lon: 39.8262 };
  const qibla = useMemo(() => {
    if (!geo) return null;
    const φ = (geo.lat * Math.PI) / 180;
    const λ = (geo.lon * Math.PI) / 180;
    const λK = (KAABA.lon * Math.PI) / 180;
    const φK = (KAABA.lat * Math.PI) / 180;
    const Δλ = λK - λ;
    const y = Math.sin(Δλ);
    const x = Math.cos(φ) * Math.tan(φK) - Math.sin(φ) * Math.cos(Δλ);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return Math.round((brng + 360) % 360);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo?.lat, geo?.lon]);

  return (
    <div className="card !p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="section-title !text-xl">🕌 مواقيت الصلاة</h3>
        <div className="flex items-center gap-2">
          {geo ? (
            <span className="text-[11px] text-[var(--muted)]">📍 حسب موقعك</span>
          ) : (
            <button className="btn-ghost !py-1 !px-3 text-[11px]" onClick={useMyLocation}>
              📍 استخدم موقعي
            </button>
          )}
          <span className="text-[11px] text-[var(--muted)]">
            🕐 طريقة أم القرى
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="loader-ring" />
        </div>
      ) : error ? (
        <p className="text-center text-[var(--danger)] py-6">{error}</p>
      ) : data ? (
        <>
          {next && next.key !== "Sunrise" && remaining && (
            <p className="text-center mb-4">
              باقي حتى صلاة{" "}
              <span className="text-[var(--gold)] font-bold">{next.label}</span>{" "}
              ⏳ {toEasternNumbers(remaining.hours)} ساعة و{" "}
              {toEasternNumbers(remaining.mins)} دقيقة
            </p>
          )}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
            {PRAYER_ORDER.map((k) => (
              <div
                key={k}
                className={`rounded-xl py-3 text-center border transition-all ${
                  next && next.key === k
                    ? "border-[var(--gold)] bg-[var(--gold-soft)]"
                    : "border-[var(--border)]"
                }`}
              >
                <p className="text-[11px] text-[var(--muted)] mb-1">{PRAYER_AR[k]}</p>
                <p className="font-headings text-lg font-bold text-[var(--gold)]" dir="ltr">
                  {data.timings[k].slice(0, 5)}
                </p>
              </div>
            ))}
          </div>
          {data.hijri && (
            <p className="text-center text-[11px] text-[var(--muted)] mt-3 opacity-70">
              {toEasternNumbers(data.hijri.day)} {data.hijri.month}{" "}
              {toEasternNumbers(data.hijri.year)} هـ
            </p>
          )}

          {/* اتجاه القبلة — يعمل عند تمكين الموقع */}
          <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-center gap-4 flex-wrap">
            {qibla === null ? (
              <p className="text-[11px] text-[var(--muted)]">
                🧭 فعّل «استخدم موقعي» بالأعلى لعرض اتجاه القبلة
              </p>
            ) : (
              <>
                <div
                  className="relative shrink-0"
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    border: "1.5px solid var(--gold)",
                    boxShadow: "0 0 14px rgba(212,175,55,.15)",
                  }}
                >
                  {/* علامات الاتجاه */}
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[var(--gold)]">ش</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-[var(--muted)]">ج</span>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">ق</span>
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)]">غ</span>
                  {/* خط الشامخ الدائري يتعمم من مركز الدائرة زاوية القبلة */}
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${qibla}deg)`,
                      transition: "transform .8s ease-out",
                    }}
                  >
                    {/* سهم يشير للأعلى ثم يدور زاوية القبلة */}
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        left: "50%",
                        marginLeft: -7,
                        width: 0,
                        height: 0,
                        borderLeft: "7px solid transparent",
                        borderRight: "7px solid transparent",
                        borderBottom: "16px solid var(--gold)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 28,
                        left: "50%",
                        marginLeft: -1.5,
                        width: 3,
                        height: 20,
                        background: "var(--gold)",
                        borderRadius: 2,
                        opacity: 0.65,
                      }}
                    />
                  </div>
                </div>
                <div className="text-center sm:text-start">
                  <p className="text-sm font-bold text-[var(--gold)]">🧭 اتجاه القبلة</p>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    إلى الكعبة المشرفة — {toEasternNumbers(qibla)}° من الشمال
                  </p>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
