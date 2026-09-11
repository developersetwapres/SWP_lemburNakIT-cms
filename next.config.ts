import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";

if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("NEXT_PUBLIC_BASE_PATH must start with '/' and must not end with '/'.");
}

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
};

export default nextConfig;
