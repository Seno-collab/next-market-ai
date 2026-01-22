import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate a standalone server bundle so the Docker image only needs Node.js and build output
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "157.66.218.138",
        port: "9000",
      },
    ],
  },
};

export default nextConfig;
