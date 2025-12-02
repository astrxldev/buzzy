import BundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
});

const nextConfig: NextConfig = withBundleAnalyzer({
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: "gi.yatta.moe",
      },
      {
        hostname: "cdn.dgnr.us",
      },
      {
        hostname: "i.ytimg.com",
      },
    ],
  },
  // reactCompiler: true,
  allowedDevOrigins: ["astral:3000", "dev3000.dgnr.us"],
  // basePath: "/beta"
});

export default nextConfig;
