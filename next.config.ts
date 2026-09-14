import type { NextConfig } from "next";

const phaserBuild = "phaser/dist/phaser.esm.js";

const nextConfig: NextConfig = {
  // Cursor Cloud / CVM port preview is not localhost; without this, Next 16
  // blocks /_next/* and the page stays on the SSR "Opening the hearth…" shell.
  allowedDevOrigins: ["*.agent.cvm.dev", "**.agent.cvm.dev"],
  serverExternalPackages: ["phaser"],
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
};

export default nextConfig;
