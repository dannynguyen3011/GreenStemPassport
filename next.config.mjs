/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recharts ESM + Next webpack đôi khi gây chunk lỗi runtime (__webpack_modules__...)
  transpilePackages: ["recharts"],
  // Standalone output: tạo bundle tối thiểu cho Docker production image
  // (chỉ copy .next/standalone + .next/static + public là chạy được)
  output: "standalone",
};

export default nextConfig;
