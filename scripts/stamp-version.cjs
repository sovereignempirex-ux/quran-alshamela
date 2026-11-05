// توليد ملفات الإصدار في public/ قبل البناء:
//  - public/version.json      → يستخدمه مكوّن AppUpdater لفحص التحديث الذاتي
//  - public/auto_update.json  → يستخدمه @capago/capacitor-updater في APK
// الاستخدام: node scripts/stamp-version.cjs
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = pkg.version;

const repo = "sovereignempirex-ux/quran-alshamela";
const zipUrl =
  `https://github.com/${repo}/releases/download/v${version}/web-app.zip`;

const versionJson = { app: "quran-alshamela", version };
const autoUpdateJson = { version, url: zipUrl };

const pub = path.join(root, "public");
if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });
fs.writeFileSync(path.join(pub, "version.json"), JSON.stringify(versionJson, null, 2) + "\n");
fs.writeFileSync(path.join(pub, "auto_update.json"), JSON.stringify(autoUpdateJson, null, 2) + "\n");
console.log("stamped version " + version + " -> public/version.json + public/auto_update.json");
