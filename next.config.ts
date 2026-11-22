import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "@mastra/core", "@solana/web3.js", "pg", "exifr"],
  images: { unoptimized: true },
};

export default config;
