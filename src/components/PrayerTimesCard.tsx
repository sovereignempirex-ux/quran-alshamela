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
        </>
      ) : null}
    </div>
  );
}
