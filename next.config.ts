import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { position: "top-right" },
  output: "standalone",
  serverExternalPackages: ["sql.js"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/sql.js/dist/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./dist/**/*"],
  },
};

export default nextConfig;
