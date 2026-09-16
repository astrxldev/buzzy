import type { NextConfig } from "next";

export default {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/i/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/i/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        hostname: "gi.yatta.moe",
      },
      {
        hostname: "cdn.dgnr.us",
      },
      {
        hostname: "cdn.gunshiz.top",
      },
      {
        hostname: "i.ytimg.com",
      },
      {
        hostname: "cards.enka.network",
      },
    ],
    localPatterns: [
      { pathname: "/api/card/*" },
      { pathname: "/api/slip/*" },
      {
        pathname: "/cdn/*",
      },
    ],
    minimumCacheTTL: 86400,
  },
  experimental: {
    imgOptTimeoutInSeconds: 30,
    typedEnv: true,
    viewTransition: true,
    serverActions: { bodySizeLimit: "30mb" },
  },
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  // reactCompiler: true,
  allowedDevOrigins: ["astral:3000", "dev3000.astrxl.dev", "nyx"],
  // basePath: "/beta"
  output: "standalone",
} satisfies NextConfig;
