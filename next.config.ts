import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [{
      hostname: "gi.yatta.moe"
    }]
  }
};

export default nextConfig;
