import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next's dev server treats 127.0.0.1 and any LAN address as a different
   * origin from localhost and blocks /_next/hmr for them. That takes the
   * Turbopack client runtime down with it, so the page renders but never
   * hydrates. Allowing the loopback and private ranges keeps the app usable
   * however you reach the dev server.
   */
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "[::1]",
    "0.0.0.0",
    "*.local",
    "10.*.*.*",
    "172.*.*.*",
    "192.168.*.*",
  ],
};

export default nextConfig;
