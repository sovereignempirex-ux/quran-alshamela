// قائمة القّاءت (من خوادم mp3quran - كل سورة ملف mp3 كامل)
export interface Reciter {
  id: string;
  name: string;
  server: string;
}

export const reciters: Reciter[] = [
  { id: "afs", name: "مشاري العفاسي", server: "https://server8.mp3quran.net/afs" },
  { id: "ahmad_huth", name: "أحمد بن علي الحذيفي", server: "https://server8.mp3quran.net/ahmad_huth" },
  { id: "ahmed_ibn_3ali", name: "أحمد بن علي العجمي", server: "https://server8.mp3quran.net/ahmed_ibn_3ali" },
  { id: "akdr", name: "أكرم العلاقمي", server: "https://server8.mp3quran.net/akdr" },
  { id: "akil", name: "عقيل المناصرة", server: "https://server8.mp3quran.net/akil" },
  { id: "al_7asan", name: "الحسن محمد", server: "https://server8.mp3quran.net/al_7asan" },
  { id: "al7usaree", name: "محمود خليل الحصري", server: "https://server8.mp3quran.net/al7usaree" },
  { id: "alhusaree", name: "الحصري (مصحف مجود)", server: "https://server8.mp3quran.net/alhusaree" },
  { id: "alfajr", name: "عبد الله بصفر", server: "https://server8.mp3quran.net/alfajr" },
  { id: "alfateh", name: "محمد آل فاتح", server: "https://server8.mp3quran.net/alfateh" },
  { id: "alhashim", name: "صلاح الهاشم", server: "https://server8.mp3quran.net/alhashim" },
  { id: "alhuda", name: "عبد الله خياط", server: "https://server8.mp3quran.net/alhuda" },
  { id: "ali", name: "علي جابر", server: "https://server8.mp3quran.net/ali" },
  { id: "alzain", name: "محمد الزين", server: "https://server8.mp3quran.net/alzain" },
  { id: "ayyub", name: "محمد أيوب", server: "https://server8.mp3quran.net/ayyub" },
  { id: "basit", name: "عبد الباسط عبد الصمد", server: "https://server8.mp3quran.net/basit" },
  { id: "bukheet", name: "محمد بن عبد الله بخيت", server: "https://server8.mp3quran.net/bukheet" },
  { id: "dosry", name: "عبد الله الدوسري", server: "https://server8.mp3quran.net/dosry" },
  { id: "fares", name: "فارس عباد", server: "https://server8.mp3quran.net/fares" },
  { id: "gamdi", name: "سعد الغامدي", server: "https://server8.mp3quran.net/gamdi" },
  { id: "hani", name: "هاني الرفاعي", server: "https://server8.mp3quran.net/hani" },
  { id: "jbril", name: "محمد جبريل", server: "https://server8.mp3quran.net/jbrl" },
  { id: "juhanee", name: "أحمد خليل الجهني", server: "https://server8.mp3quran.net/juhanee" },
  { id: "minsh", name: "محمد صديق المنشاوي", server: "https://server8.mp3quran.net/minsh" },
  { id: "mensh", name: "المنشاوي (مصحف مجود)", server: "https://server8.mp3quran.net/mensh" },
  { id: "mohsin", name: "محسن القاسم", server: "https://server8.mp3quran.net/mohsin" },
  { id: "muftah", name: "محمد المفتاح", server: "https://server8.mp3quran.net/muftah" },
  { id: "mustafa", name: "مصطفى اللاهوني", server: "https://server8.mp3quran.net/mustafa" },
  { id: "nasser", name: "ناصر القطامي", server: "https://server8.mp3quran.net/nasser" },
  { id: "qari", name: "ياسر الدوسري", server: "https://server8.mp3quran.net/qari" },
  { id: "qasm", name: "عبد المحسن القاسم", server: "https://server8.mp3quran.net/qasm" },
  { id: "sahl", name: "عبد الله صهل", server: "https://server8.mp3quran.net/sahl" },
  { id: "salamah", name: "عبد الله سلامة", server: "https://server8.mp3quran.net/salamah" },
  { id: "shah", name: "أحمد الشحيمي", server: "https://server8.mp3quran.net/shah" },
  { id: "shaksh", name: "محمد صالح الشنقيطي", server: "https://server8.mp3quran.net/shaksh" },
  { id: "shur", name: "سعود الشريم", server: "https://server8.mp3quran.net/shur" },
  { id: "tnjy", name: "أحمد الطنطاوي", server: "https://server8.mp3quran.net/tnjy" },
  { id: "waleed", name: "وليد النائحي", server: "https://server8.mp3quran.net/waleed" },
];

export const defaultReciter = "afs";

export function getReciter(id: string): Reciter {
  return reciters.find((r) => r.id === id) || reciters[0];
}
