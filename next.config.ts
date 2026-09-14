import type { NextConfig } from "next";

const phaserBuild = "phaser/dist/phaser.esm.js";

const nextConfig: NextConfig = {
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
