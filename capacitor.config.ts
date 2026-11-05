import type { CapacitorConfig } from '@capacitor/cli';

// إعداد كاباسيتور — التطبيق يعمل محلياً بالكامل (no server dependency)
// الويب يُقدَّم من مجلد out (تصدير Next الثابت) داخل WebView
// والبيانات تُجلب من إنترنت المستخدم مباشرة (quran.com / alquran.cloud / aladhan)
const config: CapacitorConfig = {
  appId: 'com.quran.alshamela',
  appName: 'القرآن الكريم',
  webDir: 'out',
  android: {
    // لا يحتاج خادم — كل شيء محلي
    allowMixedContent: false,
    backgroundColor: '#0d1421',
  },
  plugins: {
    // التحديث الذاتي: يجلب auto_update.json الخادمي (إصدار + رابط web-app.zip)
    // ويطبّق الحزمة الجديدة بصمت عند الإقلاع التالي — دون متجر Play
    CapacitorUpdater: {
      autoUpdateUrl: 'https://quran-alshamela.vercel.app/auto_update.json',
      autoUpdate: true,
      updateUrl: '',
      statsUrl: '',
    },
  },
};

export default config;
