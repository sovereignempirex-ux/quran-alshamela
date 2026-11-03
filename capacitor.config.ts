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
};

export default config;
