import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emits a self-contained server in .next/standalone. The desktop app bundles it
   * and starts it on launch, so the packaged app needs no Node install.
   */
  output: "standalone",
  /**
   * DATA_DIR and EXPORT_DIR default to folders inside the project, so the file
   * tracer pulls in whatever is in them: a developer's match database and saved
   * Riot key. They hold runtime state only and must never ship in a build.
   */
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./exports/**/*"],
  },

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
