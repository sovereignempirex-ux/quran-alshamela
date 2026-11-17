// مولّد قائمة القرّاء — يجلب كل القرّاء من MP3Quran API ويوسّع src/lib/reciters.ts
// الاستخدام: node scripts/gen-reciters.mjs
// يحافظ على الإدخالات الحالية كما هي (لأن معرفاتها محفوظة في إعدادات المستخدمين)
// ويضيف كل قارئ جديد ليس باسمه ضمن القائمة.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = join(__dirname, "..", "src", "lib", "reciters.ts");
const API = "https://mp3quran.net/api/v3/reciters?language=ar";

// توحيد صيغة الاسم لمقارنة التكرار (تجاهل المسافات وأشكال الهمزة والتاء المربوطة)
function normalizeName(name) {
  return String(name)
    .replace(/\s+/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

const res = await fetch(API);
if (!res.ok) {
  console.error("فشل جلب API:", res.status);
  process.exit(1);
}
const data = await res.json();
const apiReciters = data.reciters || [];

// اختيار أفضل مصحف: مرتل حفص كامل (114) أولاً، وإلا الأكبر عدد سور
function pickMoshaf(reciter) {
  const list = reciter.moshaf || [];
  if (!list.length) return null;
  const fullHafs = list.filter((m) => m.moshaf_type === 11 && m.surah_total === 114);
  if (fullHafs.length) return fullHafs[0];
  const sorted = [...list].sort((a, b) => b.surah_total - a.surah_total);
  return sorted[0];
}

// قراءة الملف الحالي واستخراج الإدخالات الموجودة
const current = readFileSync(TARGET, "utf8");
const existingNames = new Set();
for (const m of current.matchAll(/name:\s*"([^"]+)"/g)) {
  existingNames.add(normalizeName(m[1]));
}

// بناء الإدخالات الجديدة
const newEntries = [];
const seenSlugs = new Set();
for (const r of apiReciters) {
  if (existingNames.has(normalizeName(r.name))) continue;
  const m = pickMoshaf(r);
  if (!m) continue;
  // تجاهل المصاحب القليلة السور (أقل من 30 سورة غير مفيدة كمصدر تلاوة كامل)
  if (m.surah_total < 30) continue;
  const slugMatch = m.server.match(/\/audio\/([^/]+)\/r\d+\/?$/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];
  if (seenSlugs.has(slug)) continue;
  seenSlugs.add(slug);
  const server = m.server.endsWith("/") ? m.server : `${m.server}/`;
  newEntries.push({
    name: r.name,
    slug,
    server,
    surahs: m.surah_total,
  });
}

// ترتيب أبجدي (حسب الحرف العربي)
newEntries.sort((a, b) => a.name.localeCompare(b.name, "ar"));

const newLines = newEntries
  .map((e) => `  { id: "${e.slug}", name: "${e.name}", server: "${e.server}" },`)
  .join("\n");

// إدراج الإدخالات الجديدة قبل إغلاق مصفوفة reciters
const insertAt = current.indexOf("\n];");
if (insertAt === -1) {
  console.error("لم يُعثر على نهاية مصفوفة reciters");
  process.exit(1);
}
const next = current.slice(0, insertAt) + "\n" + newLines + current.slice(insertAt);

writeFileSync(TARGET, next, "utf8");
console.log(`✓ أُضيف ${newEntries.length} قارئاً جديداً إلى src/lib/reciters.ts`);
for (const e of newEntries) console.log(`   + ${e.name} (${e.surahs} سورة)`);
