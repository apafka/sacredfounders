import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/game.html", destination: "/" }];
  },
};

export default nextConfig;
