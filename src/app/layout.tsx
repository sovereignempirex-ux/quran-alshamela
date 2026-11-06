import type { Metadata, Viewport } from "next";
import { Noto_Kufi_Arabic, Amiri, Scheherazade_New } from "next/font/google";
import "./globals.css";

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  variable: "--font-ui",
  display: "swap",
});

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-headings",
  display: "swap",
});

const scheherazade = Scheherazade_New({
  weight: ["400", "700"],
  subsets: ["arabic"],
  variable: "--font-quran",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "القرآن الكريم - مصحف الشاملة",
    template: "%s | مصحف الشاملة",
  },
  description:
    "مصحف إلكتروني شامل: تلاوات بصوت أشهر القرّاء، تفسير الآيات، البحث الفوري، المفضلة والعلامات المرجعية، آية اليوم — بتصميم أنيق يعمل على كل الأجهزة.",
  applicationName: "مصحف الشاملة",
  keywords: ["القرآن", "المصحف", "تلاوات", "تفسير", "آية اليوم"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1421",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// سكربت يضبط الثيم من الـ localStorage قبل الرسم لمنع وميض الشاشة
const themeScript = `
try {
  var s = JSON.parse(localStorage.getItem('quranAppSettings') || '{}');
  var t = s.theme || 'dark';
  if (t === 'auto') { var h = new Date().getHours(); t = (h >= 19 || h < 6) ? 'dark' : 'light'; }
  document.documentElement.setAttribute('data-theme', t);
  if (s.fontSize) document.documentElement.style.setProperty('--ayat-size', s.fontSize + 'px');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${notoKufi.variable} ${amiri.variable} ${scheherazade.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
