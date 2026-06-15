import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    ".railway.app",
    ".up.railway.app",
    ".vercel.app",
    ".trycloudflare.com",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
