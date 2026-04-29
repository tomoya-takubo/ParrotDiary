// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xpzsyghvdywzvnwbpevy.supabase.co',
      }
    ]
  },
};

export default nextConfig;
