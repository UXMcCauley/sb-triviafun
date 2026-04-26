import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1.nip.io",
    "localhost.localdomain",
    "sb-triviafun.vercel.app",
  ],
};

export default nextConfig;
