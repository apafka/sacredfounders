import type { NextConfig } from "next";

const phaserBuild = "phaser/dist/phaser.esm.js";

/** Allow alanpafka.com to embed this app. Omit X-Frame-Options so CSP wins. */
export const FRAME_ANCESTORS_CSP =
  "frame-ancestors 'self' https://alanpafka.com https://www.alanpafka.com;";

const nextConfig: NextConfig = {
  // Cursor Cloud / CVM port preview is not localhost; without this, Next 16
  // blocks /_next/* and the page stays on the SSR "Opening the hearth…" shell.
  allowedDevOrigins: ["*.agent.cvm.dev", "**.agent.cvm.dev"],
  serverExternalPackages: ["phaser"],
  transpilePackages: ["three", "@react-three/fiber"],
  turbopack: {
    resolveAlias: {
      phaser: phaserBuild,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      phaser: phaserBuild,
    };
    return config;
  },
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
