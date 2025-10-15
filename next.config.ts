import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "gi.yatta.moe",
      },
      {
        hostname: "cdn.dgnr.us",
      },
    ],
  },
  // reactCompiler: true,
  allowedDevOrigins: ["astral:3000", "dev3000.dgnr.us"],
  // basePath: "/beta"
};

export default nextConfig;
