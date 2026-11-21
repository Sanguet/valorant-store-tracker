import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["sql.js"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/sql.js/dist/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": ["./data/**/*"],
  },
};

export default nextConfig;
