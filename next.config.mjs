/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // تصدير ثابت (بدون سيرفر) — جاهز لكل من إلكترون (EXE) وكاباسيتور (APK)
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
