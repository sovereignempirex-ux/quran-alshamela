// الأنواع المشتركة في التطبيق

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  verses: number;
  type: "مكية" | "مدنية";
}

export interface Ayah {
  id: number;
  verse_key: string;
  text_uthmani: string;
}

export interface SearchResult {
  verse_key: string;
  text: string;
  words: { text: string; highlight: boolean; char_type: string }[];
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
}

export interface TafsirItem {
  tafsirId: string;
  tafsirName: string;
  surahName: string;
  surahNumber: number;
  numberInSurah: number;
  text: string;
}

export interface FavoriteSurah extends SurahMeta {}

export interface BookmarkAyah {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
  note?: string;
}

export interface LastRead {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
}

export type SectionId = "home" | "surahs" | "reader" | "search" | "favorites" | "offline" | "adhkar" | "downloads";

// ثيمات لونية جاهزة
export type Palette = "gold" | "olive" | "indigo" | "desert" | "ramadan";

export interface AppSettings {
  theme: "dark" | "light" | "auto"; // ليلي/نهاري/تلقائي حسب الوقت
  fontSize: number; // حجم خط الآيات px
  reciter: string; // معرف القارئ (server/name)
  displayMode: "continuous" | "byline" | "mushaf"; // عرض المصحف / آية بسطر / صفحات المصحف
  autoNext: boolean; // الانتقال للسورة التالية تلقائياً
  speed: number; // سرعة التلاوة
  volume: number; // 0..1
  dailyGoal: number; // ورد يومي: عدد الآيات المستهدف
  memorize: boolean; // وضع الحفظ (تسميع): إخفاء النص تدريجياً
  repeatAyah: boolean; // تكرار التلاوة: يعيد السورة من البداية عند نهايتها
  showTranslation: boolean; // ترجمة إنجليزية تحت الآية (عرض آية بسطر)
  showTajweed: boolean; // تلوين أحكام التجويد (مد/غنّة/قلقلة/إخفاء...)
  keepAwake: boolean; // مضاد للسكون: يمنع إطفاء الشاشة أثناء الاستخدام
  comfort: boolean; // وضع الراحة: ألوان دافئة ومسافات أوسع لراحة العين
  serialRepeat: number; // 0=بدون · 2/3: تُعاد كل آية N مرات قبل التالية (حفظ)
  pauseOnBlur: boolean; // إيقاف التلاوة عند مغادرة التطبيق
  palette: Palette; // الثيم اللوني الجاهز
  autoWarm: boolean; // سطوع تلقائي: يفعّل الإضاءة الدافئة تلقائياً بعد المغرب
  clickSound: boolean; // صوت نقرة خفيف عند الضغط على الأزرار
  haptics: boolean; // اهتزاز لمسي عند الأزرار (هاتف)
  highContrast: boolean; // تباين عالٍ للكبار وضعف البصر
  simpleFont: boolean; // خط مبسط ومسافات واسعة (كتب الحركة ووضوح القراءة)
}

export interface TafsirSource {
  id: string;
  name: string;
  edition: string;
}
