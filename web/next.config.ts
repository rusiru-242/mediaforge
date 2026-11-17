import type { NextConfig } from "next";
import path from "path";

const isDevelopment = process.env.NODE_ENV === "development";
const apiOrigin = new URL(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8081/api/v1"
).origin;
const developmentConnectSources = isDevelopment
  ? " http://localhost:8080 http://127.0.0.1:8080 http://localhost:8081 http://127.0.0.1:8081"
  : "";
const developmentMediaSources = isDevelopment ? " http:" : "";
const developmentScriptSources = isDevelopment ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${developmentScriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' data: blob: ${apiOrigin}${developmentMediaSources}; connect-src 'self' ${apiOrigin}${developmentConnectSources}; font-src 'self' data:; frame-ancestors 'none';`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
