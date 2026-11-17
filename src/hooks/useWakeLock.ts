"use client";

import { useEffect, useRef } from "react";

// ============================================================
// مضاد السكون (Screen Wake Lock) — يمنع إطفاء الشاشة
// يعمل على: أندرويد (كروم/WebView)، iOS 16.4+، ويندوز (إلكترون/كروم)
// يُعاد طلبه تلقائياً عند العودة للتطبيق بعد تبديل النوافذ.
// ============================================================

interface WakeLockLike {
  request(type: "screen"): Promise<WakeLockSentinelLike>;
}

interface WakeLockSentinelLike {
  released: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
}

export function useWakeLock(enabled: boolean, active: boolean) {
  const lockRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const wl = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    if (!wl) return; // بيئة غير مدعومة — تجاهل بهدوء

    let cancelled = false;

    const release = async () => {
      const lock = lockRef.current;
      lockRef.current = null;
      if (lock && !lock.released) {
        try {
          await lock.release();
        } catch {
          /* تجاهل */
        }
      }
    };

    const acquire = async () => {
      if (cancelled || !enabled || !active || document.visibilityState !== "visible") {
        await release();
        return;
      }
      if (lockRef.current && !lockRef.current.released) return;
      try {
        const sentinel = await wl.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        lockRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          if (lockRef.current === sentinel) lockRef.current = null;
        });
      } catch {
        /* قد يرفضه النظام — تجاهل */
      }
    };

    acquire();
    const onVisibility = () => acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [enabled, active]);
}
