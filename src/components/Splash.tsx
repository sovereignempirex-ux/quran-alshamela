"use client";

import { useEffect, useState } from "react";
import { toEasternNumbers } from "@/lib/utils";

interface SplashProps {
  onEnter: () => void;
}

// تلميحات دوّارة تظهر في شاشة البداية
const TIPS = [
  "💡 اضغط مطولاً على أي آية لفتح قائمتها",
  "🎤 جرّب التسميع الصوتي — يقيّم تسميعك كلمة كلمة",
  "🤖 اسأل المساعد الذكي عن تفسير أي آية",
  "⏱ فعّل مؤقت النوم لتتلاوت لك آياتك قبل النوم",
  "💾 «حفظ بدون نت» يجعل السورة تعمل بلا إنترنت",
  "🎨 غير الثيم من الإعدادات — 5 ثيمات جاهزة",
  "📿 أذكارك اليومية بعدّاد في تبويب الأذكار",
  "⌨️ اختصار J/K للتنقل بين السور من الكيبورد",
];

export default function Splash({ onEnter }: SplashProps) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    setTip(Math.floor(Math.random() * TIPS.length));
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center text-center px-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(26,35,126,0.85), transparent), radial-gradient(900px 500px at 80% 110%, rgba(0,188,212,0.12), transparent), var(--bg)",
      }}
    >
      <div className="fade-in-up">
        <div className="bismillah !mb-4">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>

        <h1 className="splash-title">القرآن الكريم</h1>
        <p className="text-xl md:text-2xl text-[var(--muted)] mb-2">
          مصحف الشاملة الإلكتروني
        </p>
        <p className="text-sm text-[var(--muted)] opacity-75 mb-8">
          تلاوات • تفسير • ذكاء اصطناعي • تسميع صوتي • أذكار — في تطبيق واحد
        </p>

        <button
          onClick={onEnter}
          className="pulse-gold"
          style={{
            padding: "14px 54px",
            fontSize: "1.25rem",
            fontFamily: "var(--font-headings)",
            fontWeight: 700,
            borderRadius: 50,
            background: "linear-gradient(45deg, #ffd700, #ffed4e)",
            color: "#0d1421",
            border: "none",
            cursor: "pointer",
          }}
        >
          دخول المصحف ✨
        </button>

        {/* تلميح دوّار */}
        <p key={tip} className="fade-in-up text-xs text-[var(--muted)] mt-8 opacity-80 max-w-md mx-auto">
          {TIPS[tip]}
        </p>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-[var(--muted)] opacity-70">
          <span>{toEasternNumbers(114)} سورة</span>
          <span className="text-[var(--gold)]">✦</span>
          <span>{toEasternNumbers(6236)} آية</span>
          <span className="text-[var(--gold)]">✦</span>
          <span>{toEasternNumbers(30)} جزءاً</span>
        </div>

        <p className="text-[10px] text-[var(--muted)] opacity-40 mt-6" dir="ltr">
          v2.6.0 · صفر تتبّع · يعمل من جهازك
        </p>
      </div>
    </div>
  );
}

