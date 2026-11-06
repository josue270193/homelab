import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server in .next/standalone: small Docker image without node_modules (#71).
  output: "standalone",
  // Locale routes live under /[lang] (#90). Until #91 picks the language per visitor, `/` goes to
  // English. 307 (not permanent) so browsers don't cache it.
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: false }];
  },
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
