import type { NextConfig } from "next";

/** Allow alanpafka.com to embed this app. Omit X-Frame-Options so CSP wins. */
export const FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://alanpafka.com https://www.alanpafka.com;";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/game.html", destination: "/" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: FRAME_ANCESTORS_CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
