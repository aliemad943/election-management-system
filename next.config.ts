import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    ".railway.app",
    ".up.railway.app",
    ".vercel.app",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
