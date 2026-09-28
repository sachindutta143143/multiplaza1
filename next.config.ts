import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/WASM database drivers must stay external to the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "better-sqlite3"],
};

export default nextConfig;
