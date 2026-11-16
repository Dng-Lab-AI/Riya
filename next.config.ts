import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The admin site runs on admin.localhost in development: let it load the dev server's scripts.
  allowedDevOrigins: ["admin.localhost"],
};

export default nextConfig;
