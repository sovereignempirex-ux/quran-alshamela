"use client";

interface SplashProps {
  onEnter: () => void;
}

export default function Splash({ onEnter }: SplashProps) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center text-center px-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(26,35,126,0.85), transparent), radial-gradient(900px 500px at 80% 110%, rgba(0,188,212,0.12), transparent), var(--bg)",
      }}
    >
      <div className="fade-in-up">
        <div className="bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>

        <h1 className="splash-title">القرآن الكريم</h1>
        <p className="text-xl md:text-2xl text-[var(--muted)] mb-2">
          مصحف الشاملة الإلكتروني
        </p>
        <p className="text-sm text-[var(--muted)] opacity-75 mb-10">
          تلاوات • تفسير • بحث • آية اليوم — في تطبيق واحد
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

        <div className="mt-10 flex items-center justify-center gap-6 text-xs text-[var(--muted)] opacity-70">
          <span>١١٤ سورة</span>
          <span className="text-[var(--gold)]">✦</span>
          <span>٦٢٣٦ آية</span>
          <span className="text-[var(--gold)]">✦</span>
          <span>٣٠ جزءاً</span>
        </div>
      </div>
    </div>
  );
}
