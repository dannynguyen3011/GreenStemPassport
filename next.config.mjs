/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recharts ESM + Next webpack đôi khi gây chunk lỗi runtime (__webpack_modules__...)
  transpilePackages: ["recharts"],
};

export default nextConfig;
