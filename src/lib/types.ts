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

export type SectionId = "home" | "surahs" | "reader" | "search" | "favorites" | "downloads";

export interface AppSettings {
  theme: "dark" | "light" | "auto"; // ليلي/نهاري/تلقائي حسب الوقت
  fontSize: number; // حجم خط الآيات px
  reciter: string; // معرف القارئ (server/name)
  displayMode: "continuous" | "byline"; // عرض المصحف / آية بسطر
  autoNext: boolean; // الانتقال للسورة التالية تلقائياً
  speed: number; // سرعة التلاوة
  volume: number; // 0..1
  dailyGoal: number; // ورد يومي: عدد الآيات المستهدف
  memorize: boolean; // وضع الحفظ (تسميع): إخفاء النص تدريجياً
}

export interface TafsirSource {
  id: string;
  name: string;
  edition: string;
}
