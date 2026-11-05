# 📖 مصحف الشاملة — القرآن الكريم على الويب وسطح المكتب والجوال

<div align="center">

[![Web — Vercel](https://img.shields.io/badge/ويب-Vercel%20إنتاج-000?style=flat-square&logo=vercel&logoColor=white)](https://quran-alshamela.vercel.app)
[![v2.3.0](https://img.shields.io/badge/إصدار-2.3.0-D4AF37?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/رخصة-MIT-3B82F6?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](#)
[![Ko-fi](https://img.shields.io/badge/داعمنا%20على-Ko--fi-54b2c7?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/G6R42A0N73)

**تطبيق قرآني متكامل: ويب + ويندوز + أندرويد — يعمل بلا سيرفر، وكل البيانات تُجلب مباشرة من إنترنت المستخدم**

[نسخة الويب](https://quran-alshamela.vercel.app) · [تنزيل الحزم](https://github.com/sovereignempirex-ux/quran-alshamela/releases) · [ادعمنا ☕](https://ko-fi.com/G6R42A0N73)

</div>

---

## ✨ الميزات (ما الجديد في 2.3.0)

| الميزة | الوصف |
|---|---|
| 📊 **إحصاءات قراءة** | عدّاد آيات يومي + 🔥 سلسلة أيام متتالية (streak) + رسم أسبوعي |
| 🎯 **ورد يومي** | حدّد هدفك اليومي (آيات) وشاهد شريط إنجازك يتقدّم |
| 🧠 **وضع الحفظ (تسميع)** | إخفاء نص الآيات بضبابية، وكل نقرة تكشف ثلثها للتسميع |
| ⬇️ **تحديث ذاتي** | التطبيق يحدّث نفسه في الويب وويندوز وأندرويد دون تدخل المستخدم |
| 🔂 **تكرار التلاوة** | إعادة نفس السورة تلقائياً عند نهايتها |
| 🌐 **ترجمة إنجليزية** | تحت الآية (إصدار Muhammad Asad) مع كاش محلي |
| 🧭 **اتجاه القبلة** | بوصلة دقيقة نحو الكعبة عند تمكين الموقع |
| 💾 **نسخ احتياطي** | تصدير/استيراد كل بياناتك في ملف JSON |
| 📥 **قسم تنزيل** | روابط مباشرة لِـ EXE/APK عبر GitHub Releases (في الويب فقط) |
| ☕ **دعم Ko-fi** | أعلى الموقع + بطاقة دعم برمز QR (نسخة الويب) |
| 🌟 آية اليوم | من مصحف المدينة مع التفسير الميسّر |
| 📚 تفسير متعدد | الميسّر، ابن كثير، الطبري، القرطبي |
| 🔍 بحث فوري | بقاعدة بيانات quran.com للكلمات |
| 🎧 تكوينات القرّاء | أكثر من 20 قارئاً من MP3Quran |
| 🀆 ختمة القرآن | تعلّم سور مكتملة وتتبع تقدمك 114/114 |
| ⚖ مواقيت الصلاة | حسب موقعك (Method=4 جامعة أم القرى) |
| 🔖 علامات مرجعية | حفظ الآيات واستئناف آخر قراءة تلقائياً |
| 🌓 تلقائي | ليلي/نهاري/تلقائي + أرقام عربية شرقيّة |

## ⬇️ التحديث الذاتي (كيف يعمل؟)

| المنصة | الآلية |
|---|---|
| 🌐 **الويب** | مكوّن `AppUpdater` يفحص `/version.json` كل 5 دقائق، وعند تغيّر الإصدار يعيد التحميل تلقائياً |
| 🪟 **ويندوز EXE** | إلكترون يفحص GitHub Releases عند الإقلاع + كل 30 دقيقة؛ ينزّل `web-app.zip` ويستبدل النسخة ويُعيد تشغيل نفسه (سقوط آمن عند عدم الاتصال) |
| 🤖 **أندرويد APK** | `@capgo/capacitor-updater` يفحص `auto_update.json` ويطبّق `web-app.zip` بصمت |

جميع القنوات تشترك في أرتِفاكت واحد: **web-app.zip** يُرفع مع كل إصدار (ناتج `out\\` بدون مجلد التنزيلات).

## 🏗 البنية

- **Next.js 14 (تصدير ثابت)** — كل الحزم تُبنى من نفس `out\`
- **إلكترون** — نافذة سطح المكتب تخدم الموقع داخلياً على `127.0.0.1:{port}`
- **Capacitor** — تطبيق أندرويد الأصلي
- **المصادر:** quran.com + alquran.cloud + aladhan.com + mp3quran

## 📥 التنزيل (إصدار v2.3.0)

من [صفحة الإصدارات](https://github.com/sovereignempirex-ux/quran-alshamela/releases) تجد:
- **Quran-AlShamela.Setup.2.3.0.exe** — المثبّت الكامل لويندوز (~115MB)
- **Quran-AlShamela.2.3.0.exe** — نسخة محمولة تعمل دون تثبيت (مناسبة لِومضات USB)
- **Quran-AlShamela-v2.3.0-debug.apk** — أندرويد 6.0+

أو من قسم **📥 تنزيل التطبيق** في [الموقع](https://quran-alshamela.vercel.app)

## 🛠 التطوير

```bash
npm install              # تثبيت الاعتماديات
npm run dev              # التطوير على http://localhost:3000

npm run build            # بناء ثابت → out\ (يشمل ترقيم version.json)
npm run electron:build   # حزم ويندوز (Setup + Portable) في release\
npm run cap:apk          # حزمة أندرويد debug APK (minSdk 23 = أندرويد 6.0+)
npm run pack:web         # ضغط out\ → release\web-app.zip (أرتِفاكت التحديث الذاتي)

# عند إصدار نسخة جديدة:
#   1) عدّل "version" في package.json
#   2) node scripts/stamp-version.cjs   → public/version.json + public/auto_update.json
#   3) npm run electron:build && npm run cap:apk && npm run pack:web
#   4) powershell -File scripts/gh-upload-release.ps1  (يرفع EXE+APK+web-app.zip)
#   5) npx vercel deploy --prod --yes
```

> ⚠️ بعد أي `npm install`: لا بد إعادة ترقيعات electron-builder الموجودة في [`scripts/eb-patches.md`](scripts/eb-patches.md)

## 🚀 النشر

- **Vercel:** `npx vercel deploy --prod --yes` — الإعدادات في `vercel.json` (framework=nextjs)
- **نسختك الموزّعة:** GitHub Releases عبر `scripts/gh-release.ps1` + `scripts/gh-upload-release.ps1`
- يظهر قسم تنزيل الحزم **في نسخة الويب فقط**؛ ويُخفى تلقائياً داخل EXE/APK (كشف البيئة).

## ☕ الدعم

المشروع مجاني ومفتوح دائماً — إن أردت المساهمة في استدامة الاستضافة والتطوير:
<div align="center">
<a href="https://ko-fi.com/G6R42A0N73">
<img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="ادعمنا على Ko-fi" height="42">
</a>
</div>

---

<div align="center">
صدق الله العظيم — صنع بإتقان من عمر 🌟
</div>
