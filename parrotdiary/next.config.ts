// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pjoolpfjjhnqyvohvixf.supabase.co',
      }
    ]
  },
};

export default nextConfig;