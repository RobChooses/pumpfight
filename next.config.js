/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    // NEXT_PUBLIC_THIRDWEB_CLIENT_ID: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
    // NEXT_PUBLIC_SOCIOS_APP_ID: process.env.NEXT_PUBLIC_SOCIOS_APP_ID,
    NEXT_PUBLIC_CHILIZ_CHAIN_ID: process.env.NEXT_PUBLIC_CHILIZ_CHAIN_ID || "88882",
    // NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  },
};

module.exports = nextConfig;