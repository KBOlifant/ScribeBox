import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The desktop app (npm run electron:build) bundles a self-contained server. Other builds, such as
  // Netlify's, are unchanged
  ...(process.env.ELECTRON_BUILD ? { output: "standalone" as const } : {}),
  experimental: {
    agentFeedback: true,
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
