"use client";

import { useEffect, useState } from "react";
import { KO_FI_ACCOUNT } from "@/lib/kofi";

// زر Ko-fi العائم (Floating Chat) — يُحقن في نسخة الويب فقط
// يتصل بسكربت overlay-widget.js الرسمي من Ko-fi
declare global {
  interface Window {
    kofiWidgetOverlay?: {
      draw: (
        account: string,
        opts: Record<string, string>
      ) => void;
    };
  }
}

export default function KofiWidget() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-kofi-overlay]");
    if (existing) {
      setLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://storage.ko-fi.com/cdn/scripts/overlay-widget.js";
    s.async = true;
    s.dataset.kofiOverlay = "true";
    s.onload = () => setLoaded(true);
    s.onerror = () => {};
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!loaded || !window.kofiWidgetOverlay) return;
    window.kofiWidgetOverlay.draw(KO_FI_ACCOUNT, {
      type: "floating-chat",
      "floating-chat.donateButton.text": "♡ ادعمنا",
      "floating-chat.donateButton.background-color": "#54b2c7",
      "floating-chat.donateButton.text-color": "#323842",
    });
  }, [loaded]);

  return null;
}
