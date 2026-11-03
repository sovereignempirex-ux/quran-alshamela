# ترقيعات electron-builder المحلية (v2.2.0)

بيئة الجهاز تحتوي **Smart App Control مفعّل** ويمنع تشغيل stub NSIS غير الموقّع
الذي يولّّده electron-builder لحساب ملف إزالة التثبيت (`spawn UNKNOWN`).
عمل هذا التحايل عبر 5 تعديلات داخل `node_modules`:

## 1. `node_modules/app-builder-lib/out/wine.js`
دمج `process.env` مع env الممرر (يمنع فشل spawn لنقص SystemRoot).

## 2. `node_modules/app-builder-lib/out/targets/nsis/NsisTarget.js`
- عند `signAndEditExecutable=false`: تخطي بناء/تشغيل stub BUILD_UNINSTALLER
  بالكامل + إعادة محاولات exec عند الحاجة.
- الإزالة تُولّد وقت التثبيت داخل التطبيق (انظر القوالب).

## 3. `node_modules/app-builder-lib/templates/nsis/installer.nsi`
- `!define UNINSTALLER_EMBEDDED` في التخمية الرئيسية.
- تضمين `uninstaller.nsh` في التخمية الرئيسية (كان فقط في pass1).

## 4. `node_modules/app-builder-lib/templates/nsis/include/installer.nsh`
تبديل `File ... UNINSTALLER_OUT_FILE` بـ `WriteUninstaller "$INSTDIR\..."`.

## 5. `node_modules/app-builder-lib/templates/nsis/include/{getProcessInfo,allowOnlyOneInstallerInstance,uninstaller.nsh}`
توليد `Function un._GetProcessInfo` في pass2 + سياق `CHECK_APP_RUNNING_UN_CONTEXT`.

> ⚠️ إذا أُعيد `npm install` (حذف node_modules) يجب إعادة تطبيق هذه الترقيعات.
