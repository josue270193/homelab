import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone: small Docker image without node_modules (#71).
  output: "standalone",
  // Locale routes live under /[lang] (#90); src/proxy.ts sends `/` to one of them (#91).
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
