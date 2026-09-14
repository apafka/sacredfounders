import type { NextConfig } from "next";

const frameAncestorsCsp =
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
            value: frameAncestorsCsp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
