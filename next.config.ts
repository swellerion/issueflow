import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use a separate build directory for the e2e test server so it can run
  // alongside the dev server without competing for the .next/dev/lock file.
  distDir: process.env.NEXT_E2E === "1" ? ".next-e2e" : ".next",
};

export default nextConfig;
