import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
