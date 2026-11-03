// نسخ حزم التوزيع (EXE/APK) من release/ إلى out/downloads/
// ليكون لنسخة الويب روابط تنزيل مباشرة.
// الاستخدام: node scripts/copy-downloads.cjs
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const release = path.join(root, "release");
const outDownloads = path.join(root, "out", "downloads");

fs.mkdirSync(outDownloads, { recursive: true });

const files = fs
  .readdirSync(release)
  .filter(
    (f) =>
      (f.endsWith(".exe") && !f.includes("blockmap") && !f.startsWith("__uninstaller") && f.includes("2.")) ||
      f.endsWith(".apk")
  );

if (!files.length) {
  console.log("لا توجد حزم EXE/APK في release/ للنشر");
  process.exit(0);
}

for (const f of files) {
  const src = path.join(release, f);
  const dst = path.join(outDownloads, f);
  fs.copyFileSync(src, dst);
  const mb = (fs.statSync(dst).size / (1024 * 1024)).toFixed(1);
  console.log(`out/downloads/${f} (${mb} MB) ✓`);
}
console.log("تم نسخ الملفات إلى out/downloads ✓");
