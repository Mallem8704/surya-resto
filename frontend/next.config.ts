import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone mode for Docker, but disable on Vercel to prevent .nft.json ENOENT errors
  output: process.env.VERCEL ? undefined : "standalone",
  async rewrites() {
    const apiUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiUrl}/uploads/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        // Immutable cache for static dishes, icons, and bundles (0ms latency from browser disk cache)
        source: "/(dishes|icons|_next/static)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Fresh HTML for application pages & dynamic routes
        source: "/:path((?!dishes|icons|_next/static).*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
